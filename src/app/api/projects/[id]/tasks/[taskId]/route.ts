import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { recalcProjectHealth } from "@/lib/project-health";
import { fireWebhooks } from "@/lib/n8n-trigger";
import { findProjectInOrg, isActiveMember } from "@/lib/tenant";

async function findTask(projectId: string, taskId: string, organizationId: string) {
  const project = await findProjectInOrg(projectId, organizationId);
  if (!project) return null;
  return prisma.projectTask.findFirst({ where: { id: taskId, projectId } });
}

export const dynamic = "force-dynamic";

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  estimatedHrs: z.number().nullable().optional(),
  actualHrs: z.number().optional(),
  sortOrder: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await findTask(params!.id, params!.taskId, organizationId);
    if (!existing) return notFound("Task");
    if (parsed.data.assigneeId && !(await isActiveMember(parsed.data.assigneeId, organizationId)))
      return badRequest("Assignee is not a member of this organization");

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.dueDate !== undefined)
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    if (parsed.data.startDate !== undefined)
      data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    if (parsed.data.status === "DONE" && existing.status !== "DONE")
      data.completedAt = new Date();
    if (parsed.data.status && parsed.data.status !== "DONE" && existing.status === "DONE")
      data.completedAt = null;

    const task = await withRetry(() =>
      prisma.projectTask.update({
        where: { id: existing.id },
        data,
        include: { assignee: { select: { id: true, name: true } } },
      })
    );

    // Awaited (not fire-and-forget) so serverless runtimes don't drop the work.
    if (parsed.data.status === "DONE" && existing.status !== "DONE") {
      await recalcProjectHealth(existing.projectId).catch(() => {});
      await fireWebhooks(existing.projectId, "TASK_DONE", {
        taskId: task.id,
        taskTitle: task.title,
        phase: task.phase,
      }).catch(() => {});
    } else if (parsed.data.status === "BLOCKED") {
      await recalcProjectHealth(existing.projectId).catch(() => {});
    }

    return ok(task);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await findTask(params!.id, params!.taskId, organizationId);
    if (!existing) return notFound("Task");
    await prisma.projectTask.delete({ where: { id: existing.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
