import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { recalcProjectHealth } from "@/lib/project-health";
import { fireWebhooks } from "@/lib/n8n-trigger";

export const dynamic = "force-dynamic";

const CreateTaskSchema = z.object({
  phase: z.enum(["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"]),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  estimatedHrs: z.number().optional(),
  tags: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
});

export const GET = withAuth(async (req: NextRequest, { params }) => {
  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { projectId: params!.id };
    if (phase) where.phase = phase;
    if (status) where.status = status;

    const tasks = await withRetry(() =>
      prisma.projectTask.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true } },
          subtasks: { include: { assignee: { select: { id: true, name: true } } } },
        },
        orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
      })
    );

    return ok(tasks);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const maxOrder = await prisma.projectTask.aggregate({
      where: { projectId: params!.id, phase: parsed.data.phase as never },
      _max: { sortOrder: true },
    });

    const task = await withRetry(() =>
      prisma.projectTask.create({
        data: {
          ...parsed.data,
          phase: parsed.data.phase as never,
          status: (parsed.data.status ?? "BACKLOG") as never,
          priority: (parsed.data.priority ?? "MEDIUM") as never,
          projectId: params!.id,
          reporterId: user.userId,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
          tags: parsed.data.tags ?? [],
        },
        include: { assignee: { select: { id: true, name: true } } },
      })
    );

    return ok(task, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
