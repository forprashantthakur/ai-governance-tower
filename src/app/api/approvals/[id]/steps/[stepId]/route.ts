import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, forbidden, notFound, conflict, serverError } from "@/lib/api-response";
import { approvalWorkflowsInOrg } from "@/lib/tenant";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const DecideSchema = z.object({
  status: z.enum(["APPROVED","REJECTED","ESCALATED"]),
  comments: z.string().max(5000).optional(),
});

const AUDIT_ACTION = { APPROVED: "APPROVE", REJECTED: "REJECT", ESCALATED: "ESCALATE" } as const;
const OVERRIDE_ROLES = new Set(["OWNER", "ADMIN"]);

export const PATCH = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = DecideSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: { id: params.id, ...approvalWorkflowsInOrg(organizationId) },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (!workflow) return notFound("Approval workflow");
    const step = workflow.steps.find((s) => s.id === params.stepId);
    if (!step) return notFound("Step");

    // Decision rules: separation of duties, assigned approver, order, no re-deciding.
    if (workflow.status !== "PENDING" && workflow.status !== "ESCALATED")
      return conflict(`This workflow is already ${workflow.status.toLowerCase()}`);
    if (step.status !== "PENDING" && step.status !== "ESCALATED")
      return conflict("This step has already been decided");
    if (workflow.requestedBy === user.userId)
      return forbidden("You cannot decide an approval you requested");
    if (step.assigneeId && step.assigneeId !== user.userId && !OVERRIDE_ROLES.has(user.orgRole))
      return forbidden("This step is assigned to someone else");
    if (workflow.steps.some((s) => s.stepOrder < step.stepOrder && s.status !== "APPROVED"))
      return conflict("Earlier steps must be approved first");

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.approvalStep.updateMany({
        where: { id: step.id, status: { in: ["PENDING", "ESCALATED"] } },
        data: { ...parsed.data, decidedAt: new Date() },
      });
      if (res.count !== 1) return null; // decided concurrently
      const allSteps = await tx.approvalStep.findMany({ where: { workflowId: workflow.id } });
      let wfStatus: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" = "PENDING";
      if (allSteps.some((s) => s.status === "REJECTED")) wfStatus = "REJECTED";
      else if (allSteps.some((s) => s.status === "ESCALATED")) wfStatus = "ESCALATED";
      else if (allSteps.every((s) => s.status === "APPROVED")) wfStatus = "APPROVED";
      await tx.approvalWorkflow.update({
        where: { id: workflow.id },
        data: {
          status: wfStatus,
          completedAt: wfStatus === "APPROVED" || wfStatus === "REJECTED" ? new Date() : null,
        },
      });
      return tx.approvalStep.findFirst({ where: { id: step.id } });
    });
    if (!updated) return conflict("This step has already been decided");

    await logAudit({
      userId: user.userId,
      organizationId,
      action: AUDIT_ACTION[parsed.data.status],
      resource: "ApprovalStep",
      resourceId: step.id,
      before: { status: step.status },
      after: { status: parsed.data.status, comments: parsed.data.comments, workflowId: workflow.id },
      ipAddress: getClientIp(req),
    });

    return ok(updated);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
