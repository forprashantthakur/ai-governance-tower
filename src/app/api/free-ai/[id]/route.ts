import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const STATUSES = ["PASS", "FAIL", "PARTIAL", "NOT_APPLICABLE", "PENDING_REVIEW"] as const;

const UpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  evidence: z.string().nullable().optional(),
  gapNotes: z.string().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

// PATCH /api/free-ai/:id
export const PATCH = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org mutations
    const existing = await prisma.freeAiItem.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("FreeAiItem");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const updated = await prisma.freeAiItem.update({
      where: { id: params.id },
      data: parsed.data,
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "FreeAiItem",
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

// DELETE /api/free-ai/:id
export const DELETE = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org deletions
    const existing = await prisma.freeAiItem.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("FreeAiItem");

    await prisma.freeAiItem.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "FreeAiItem",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
