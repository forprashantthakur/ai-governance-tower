import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, notFound, serverError } from "@/lib/api-response";
import { approvalWorkflowsInOrg, findModelInOrg, allActiveMembers } from "@/lib/tenant";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const StepSchema = z.object({
  stepType: z.enum(["RISK_OFFICER","LEGAL","ETHICS","DATA_PROTECTION","EXECUTIVE","CUSTOM"]),
  label: z.string().min(1),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

const CreateSchema = z.object({
  modelId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  steps: z.array(StepSchema).min(1),
});

export const GET = withAuth(async (_req, { organizationId }) => {
  try {
    const workflows = await prisma.approvalWorkflow.findMany({
      where: approvalWorkflowsInOrg(organizationId),
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
        requester: { select: { id: true, name: true } },
        steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok(workflows);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { steps, ...wf } = parsed.data;
    if (wf.modelId && !(await findModelInOrg(wf.modelId, organizationId))) return notFound("Model");
    // Assignees must be able to decide their step (the decision endpoint needs RISK_OFFICER+).
    if (!(await allActiveMembers(steps.map((s) => s.assigneeId), organizationId, ["OWNER", "ADMIN", "RISK_OFFICER"])))
      return badRequest("Every assignee must be a Risk Officer, Admin or Owner in this organization");
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        ...wf,
        organizationId,
        dueDate: wf.dueDate ? new Date(wf.dueDate) : undefined,
        requestedBy: user.userId,
        steps: {
          create: steps.map((s, i) => ({
            stepType: s.stepType,
            label: s.label,
            assigneeId: s.assigneeId,
            dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
            stepOrder: i + 1,
          })),
        },
      },
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
        requester: { select: { id: true, name: true } },
        steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
      },
    });
    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "ApprovalWorkflow",
      resourceId: workflow.id,
      after: { title: workflow.title, modelId: workflow.modelId },
      ipAddress: getClientIp(req),
    });
    return created(workflow);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
