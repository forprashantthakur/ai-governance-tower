import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateCapaSchema = z.object({
  actionType: z.enum(["CORRECTIVE", "PREVENTIVE"]).optional(),
  description: z.string().min(1).optional(),
  ownerRole: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED", "OVERDUE"]).optional(),
  effectivenessCheck: z.string().nullable().optional(),
});

// PATCH /api/ncr/:id/capa/:cid
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent NCR's organizationId
    const ncr = await prisma.nonConformity.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!ncr) return notFound("NonConformity");

    const existing = await prisma.capa.findFirst({
      where: { id: params.cid, ncrId: params.id },
    });
    if (!existing) return notFound("Capa");

    const parsed = UpdateCapaSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { dueDate, status, ...rest } = parsed.data;

    const resolvedDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing.dueDate;
    const requestedStatus = status ?? existing.status;
    // Persist OVERDUE if the due date has already passed and the CAPA is not yet closed out
    const resolvedStatus =
      resolvedDueDate &&
      resolvedDueDate < new Date() &&
      (requestedStatus === "OPEN" || requestedStatus === "IN_PROGRESS")
        ? "OVERDUE"
        : requestedStatus;

    const timestamps: { completedAt?: Date; effectivenessVerifiedAt?: Date } = {};
    if (resolvedStatus === "COMPLETED" && !existing.completedAt) {
      timestamps.completedAt = new Date();
    }
    if (resolvedStatus === "VERIFIED" && !existing.effectivenessVerifiedAt) {
      timestamps.effectivenessVerifiedAt = new Date();
    }

    const capa = await prisma.capa.update({
      where: { id: params.cid },
      data: {
        ...rest,
        status: resolvedStatus,
        ...(dueDate !== undefined && { dueDate: resolvedDueDate }),
        ...timestamps,
      },
    });

    return ok(capa);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/ncr/:id/capa/:cid
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent NCR's organizationId
    const ncr = await prisma.nonConformity.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!ncr) return notFound("NonConformity");

    const existing = await prisma.capa.findFirst({
      where: { id: params.cid, ncrId: params.id },
    });
    if (!existing) return notFound("Capa");

    await prisma.capa.delete({ where: { id: params.cid } });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
