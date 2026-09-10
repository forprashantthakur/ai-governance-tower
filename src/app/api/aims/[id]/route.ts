import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"] as const;

const UpdateSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  maturityLevel: z.number().int().min(0).max(5).optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  evidence: z.string().nullable().optional(),
  implementationNotes: z.string().nullable().optional(),
});

// PATCH /api/aims/:id — update status, maturity, owner, evidence, notes
export const PATCH = withAuth(async (req: NextRequest, { organizationId, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    if (Object.keys(parsed.data).length === 0) return badRequest("No fields to update");

    const clause = await prisma.aimsClause
      .update({
        where: { id: params.id, organizationId },
        data: { ...parsed.data, lastReviewedAt: new Date() },
      })
      .catch(() => null);

    if (!clause) return notFound("Clause");
    return ok(clause);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/aims/:id
export const DELETE = withAuth(async (_req: NextRequest, { organizationId, params }) => {
  try {
    await prisma.aimsClause
      .delete({ where: { id: params.id, organizationId } })
      .catch(() => {});
    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
