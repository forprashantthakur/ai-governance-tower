import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, conflict, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const METHODS = ["INQUIRY", "OBSERVATION", "INSPECTION", "REPERFORMANCE"] as const;
const RESULTS = ["NOT_TESTED", "EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"] as const;

const UpdateSchema = z.object({
  testRef: z.string().min(1).max(100).optional(),
  controlRef: z.string().min(1).max(100).optional(),
  controlTitle: z.string().min(1).max(500).optional(),
  framework: z.string().min(1).max(100).optional(),
  testObjective: z.string().optional().nullable(),
  testProcedure: z.string().optional().nullable(),
  method: z.enum(METHODS).optional(),
  sampleSize: z.coerce.number().int().min(0).optional(),
  samplesTested: z.coerce.number().int().min(0).optional(),
  exceptions: z.coerce.number().int().min(0).optional(),
  result: z.enum(RESULTS).optional(),
  testedBy: z.string().max(200).optional().nullable(),
  testedAt: z.string().datetime().optional().nullable(),
  evidence: z.string().optional().nullable(),
  conclusion: z.string().optional().nullable(),
});

// PATCH /api/control-testing/:id
export const PATCH = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await prisma.controlTest.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("ControlTest");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { testedAt, ...rest } = parsed.data;

    if (rest.testRef && rest.testRef !== existing.testRef) {
      const dupe = await prisma.controlTest.findFirst({
        where: { organizationId, testRef: rest.testRef, id: { not: params.id } },
        select: { id: true },
      });
      if (dupe) return conflict(`Test reference "${rest.testRef}" already exists`);
    }

    const updated = await prisma.controlTest.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(testedAt !== undefined && { testedAt: testedAt ? new Date(testedAt) : null }),
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "ControlTest",
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

// DELETE /api/control-testing/:id
export const DELETE = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await prisma.controlTest.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("ControlTest");

    await prisma.controlTest.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "ControlTest",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
