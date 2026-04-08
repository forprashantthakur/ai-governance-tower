import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { recalcProjectHealth } from "@/lib/project-health";
import { fireWebhooks } from "@/lib/n8n-trigger";

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

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.projectTask.findUnique({
      where: { id: params!.taskId },
    });
    if (!existing) return notFound("Task not found");

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
        where: { id: params!.taskId },
        data,
        include: { assignee: { select: { id: true, name: true } } },
      })
    );

    // Background: recalc health and fire webhooks
    if (parsed.data.status === "DONE" && existing.status !== "DONE") {
      recalcProjectHealth(params!.id).catch(() => {});
      fireWebhooks(params!.id, "TASK_DONE", {
        taskId: task.id,
        taskTitle: task.title,
        phase: task.phase,
      }).catch(() => {});
    } else if (parsed.data.status === "BLOCKED") {
      recalcProjectHealth(params!.id).catch(() => {});
    }

    return ok(task);
  } catch (err) {
    return serverError(err);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.projectTask.delete({ where: { id: params!.taskId } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
});
