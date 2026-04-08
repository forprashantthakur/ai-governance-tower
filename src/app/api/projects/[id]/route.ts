import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const UpdateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  currentPhase: z.enum(["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"]).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  budget: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const project = await withRetry(() =>
      prisma.project.findUnique({
        where: { id: params!.id },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          phases: { orderBy: { phase: "asc" } },
          milestones: { orderBy: { targetDate: "asc" } },
          resources: {
            include: { user: { select: { id: true, name: true, email: true, role: true } } },
          },
          linkedModels: {
            include: { model: { select: { id: true, name: true, type: true, status: true } } },
          },
          _count: { select: { tasks: true, experiments: true, milestones: true, workflows: true } },
        },
      })
    );
    if (!project) return notFound("Project not found");
    return ok(project);
  } catch (err) {
    return serverError(err);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateProjectSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const before = await prisma.project.findUnique({ where: { id: params!.id } });
    if (!before) return notFound("Project not found");

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.targetDate) data.targetDate = new Date(parsed.data.targetDate);
    if (parsed.data.status === "COMPLETED") data.completedAt = new Date();

    const project = await withRetry(() =>
      prisma.project.update({ where: { id: params!.id }, data })
    );

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      resource: "Project",
      resourceId: project.id,
      before,
      after: data,
      ipAddress: getClientIp(req),
    });

    return ok(project);
  } catch (err) {
    return serverError(err);
  }
});

export const DELETE = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const project = await prisma.project.update({
        where: { id: params!.id },
        data: { status: "CANCELLED" },
      });
      await logAudit({
        userId: user.userId,
        action: "DELETE",
        resource: "Project",
        resourceId: params!.id,
        ipAddress: getClientIp(req),
      });
      return ok(project);
    } catch (err) {
      return serverError(err);
    }
  },
  ["ADMIN", "RISK_OFFICER"]
);
