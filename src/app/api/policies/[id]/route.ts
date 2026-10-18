import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DOC_TYPES = ["POLICY", "MANUAL", "PROCEDURE", "STANDARD", "GUIDELINE", "CHARTER", "SOP"] as const;
const DOC_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "BOARD_APPROVAL_PENDING",
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
  "RETIRED",
] as const;

const UpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  type: z.enum(DOC_TYPES).optional(),
  status: z.enum(DOC_STATUSES).optional(),
  version: z.string().min(1).max(30).optional(),
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  approverRole: z.string().max(200).nullable().optional(),
  approvedBy: z.string().max(200).nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  nextReviewDate: z.coerce.date().nullable().optional(),
  integratesWith: z.array(z.string()).optional(),
  frameworkRefs: z.array(z.string()).optional(),
});

// PATCH /api/policies/:id
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.policyDocument.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return notFound("PolicyDocument");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const d = parsed.data;

    const updated = await prisma.policyDocument.update({
      where: { id: params.id },
      data: {
        ...(d.title !== undefined && { title: d.title }),
        ...(d.type !== undefined && { type: d.type }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.version !== undefined && { version: d.version }),
        ...(d.summary !== undefined && { summary: d.summary }),
        ...(d.content !== undefined && { content: d.content }),
        ...(d.ownerRole !== undefined && { ownerRole: d.ownerRole }),
        ...(d.approverRole !== undefined && { approverRole: d.approverRole }),
        ...(d.approvedBy !== undefined && { approvedBy: d.approvedBy }),
        ...(d.approvedAt !== undefined && { approvedAt: d.approvedAt }),
        ...(d.effectiveFrom !== undefined && { effectiveFrom: d.effectiveFrom }),
        ...(d.nextReviewDate !== undefined && { nextReviewDate: d.nextReviewDate }),
        ...(d.integratesWith !== undefined && { integratesWith: d.integratesWith }),
        ...(d.frameworkRefs !== undefined && { frameworkRefs: d.frameworkRefs }),
      },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/policies/:id
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.policyDocument.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return notFound("PolicyDocument");

    await prisma.policyDocument.delete({ where: { id: params.id } });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
