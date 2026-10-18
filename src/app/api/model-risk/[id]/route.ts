import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const TIERS = ["TIER_1", "TIER_2", "TIER_3"] as const;
const OUTCOMES = ["PASS", "PASS_WITH_CONDITIONS", "FAIL", "PENDING"] as const;

const UpdateSchema = z.object({
  modelId: z.string().uuid().optional().nullable(),
  modelName: z.string().min(1).max(300).optional(),
  modelOwner: z.string().max(200).optional().nullable(),
  businessUnit: z.string().max(200).optional().nullable(),
  tier: z.enum(TIERS).optional(),
  materialityScore: z.coerce.number().int().min(0).max(100).optional(),
  purpose: z.string().optional().nullable(),
  lastValidatedAt: z.string().datetime().optional().nullable(),
  nextValidationDue: z.string().datetime().optional().nullable(),
  validationOutcome: z.enum(OUTCOMES).optional(),
  validatorName: z.string().max(200).optional().nullable(),
  independentReview: z.boolean().optional(),
  conceptualSoundness: z.string().optional().nullable(),
  backtestingResult: z.string().optional().nullable(),
  benchmarkResult: z.string().optional().nullable(),
  ongoingMonitoring: z.string().optional().nullable(),
  limitations: z.string().optional().nullable(),
  conditions: z.string().optional().nullable(),
  openFindings: z.coerce.number().int().min(0).optional(),
});

// PATCH /api/model-risk/:id
export const PATCH = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await prisma.modelRiskRecord.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("ModelRiskRecord");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { modelId, lastValidatedAt, nextValidationDue, ...rest } = parsed.data;

    const updated = await prisma.modelRiskRecord.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(modelId !== undefined && { modelId: modelId || null }),
        ...(lastValidatedAt !== undefined && {
          lastValidatedAt: lastValidatedAt ? new Date(lastValidatedAt) : null,
        }),
        ...(nextValidationDue !== undefined && {
          nextValidationDue: nextValidationDue ? new Date(nextValidationDue) : null,
        }),
      },
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "ModelRiskRecord",
      resourceId: params.id,
      before: existing,
      after: updated,
      ipAddress: getClientIp(req),
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/model-risk/:id
export const DELETE = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await prisma.modelRiskRecord.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("ModelRiskRecord");

    await prisma.modelRiskRecord.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "ModelRiskRecord",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
