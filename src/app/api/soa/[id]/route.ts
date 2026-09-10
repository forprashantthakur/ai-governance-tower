import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DECISION_VALUES = ["APPLICABLE", "APPLICABLE_PLANNED", "NOT_APPLICABLE"] as const;
const IMPL_STATUS_VALUES = ["NOT_IMPLEMENTED", "PARTIAL", "IMPLEMENTED"] as const;

const UpdateSchema = z.object({
  decision: z.enum(DECISION_VALUES).optional(),
  justification: z.string().nullable().optional(),
  implStatus: z.enum(IMPL_STATUS_VALUES).optional(),
  implementationSummary: z.string().nullable().optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  linkedPolicyCodes: z.array(z.string()).optional(),
});

// PATCH /api/soa/:id — update decision, justification, impl status/summary, owner, linked policies
export const PATCH = withAuth(async (req: NextRequest, { organizationId, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    if (Object.keys(parsed.data).length === 0) return badRequest("No fields to update");

    const control = await prisma.soaControl
      .update({
        where: { id: params.id, organizationId },
        data: { ...parsed.data, lastReviewedAt: new Date() },
      })
      .catch(() => null);

    if (!control) return notFound("Control");
    return ok(control);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/soa/:id
export const DELETE = withAuth(async (_req: NextRequest, { organizationId, params }) => {
  try {
    await prisma.soaControl
      .delete({ where: { id: params.id, organizationId } })
      .catch(() => {});
    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
