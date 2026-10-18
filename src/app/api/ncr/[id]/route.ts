import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateNcrSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["MAJOR", "MINOR", "OBSERVATION", "OFI"]).optional(),
  status: z.enum(["OPEN", "UNDER_INVESTIGATION", "CAPA_ASSIGNED", "PENDING_VERIFICATION", "CLOSED"]).optional(),
  clauseRef: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  raisedBy: z.string().nullable().optional(),
  rootCause: z.string().nullable().optional(),
  immediateCorrection: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
});

// PATCH /api/ncr/:id
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org mutations
    const existing = await prisma.nonConformity.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("NonConformity");

    const parsed = UpdateNcrSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { dueDate, status, ...rest } = parsed.data;

    // Auto-stamp closedAt when the NCR is closed, unless the caller already set it
    const autoClosedAt = status === "CLOSED" && !existing.closedAt ? new Date() : undefined;

    const ncr = await prisma.nonConformity.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(autoClosedAt && { closedAt: autoClosedAt }),
      },
      include: { capas: { orderBy: { createdAt: "asc" } } },
    });

    return ok(ncr);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/ncr/:id
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org deletions
    const existing = await prisma.nonConformity.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("NonConformity");

    await prisma.nonConformity.delete({ where: { id: params.id } }); // cascades to capas

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
