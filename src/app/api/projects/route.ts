import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { BUILT_IN_TEMPLATES } from "@/lib/project-templates";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

const CreateProjectSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().optional(),
  templateId: z.string().optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  budget: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// Seed built-in templates if missing
async function ensureTemplates() {
  const count = await prisma.projectTemplate.count({ where: { isBuiltIn: true } });
  if (count === 0) {
    await prisma.projectTemplate.createMany({
      data: BUILT_IN_TEMPLATES.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        scaffold: t.scaffold as object,
        isBuiltIn: true,
      })),
    });
  }
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      withRetry(() =>
        prisma.project.findMany({
          where,
          include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { tasks: true, experiments: true, milestones: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
      ),
      prisma.project.count({ where }),
    ]);

    return ok({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const parsed = CreateProjectSchema.safeParse(body);
      if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

      const { name, description, templateId, startDate, targetDate, budget, tags } = parsed.data;

      await ensureTemplates();

      // Resolve template if provided
      let template = null;
      if (templateId) {
        template = await prisma.projectTemplate.findUnique({ where: { id: templateId } });
      }

      const start = startDate ? new Date(startDate) : new Date();

      const project = await withRetry(() =>
        prisma.project.create({
          data: {
            name,
            description,
            ownerId: user.userId,
            templateId: template?.id,
            startDate: start,
            targetDate: targetDate ? new Date(targetDate) : undefined,
            budget,
            tags: tags ?? [],
            status: "DRAFT",
          },
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        })
      );

      // Seed from template scaffold
      if (template) {
        const scaffold = template.scaffold as {
          phases?: { phase: string; plannedDays: number }[];
          tasks?: { phase: string; title: string; priority: string; estimatedHrs: number; description?: string }[];
          milestones?: { phase: string; name: string; daysFromStart: number; isGate: boolean }[];
          workflowCanvas?: object;
        };

        if (scaffold.phases?.length) {
          await prisma.projectPhaseRecord.createMany({
            data: scaffold.phases.map((p) => ({
              projectId: project.id,
              phase: p.phase as never,
              plannedDays: p.plannedDays,
              status: "BACKLOG",
            })),
          });
        }

        if (scaffold.tasks?.length) {
          await prisma.projectTask.createMany({
            data: scaffold.tasks.map((t, i) => ({
              projectId: project.id,
              phase: t.phase as never,
              title: t.title,
              description: t.description,
              priority: t.priority as never,
              estimatedHrs: t.estimatedHrs,
              sortOrder: i,
              status: "BACKLOG",
            })),
          });
        }

        if (scaffold.milestones?.length) {
          await prisma.milestone.createMany({
            data: scaffold.milestones.map((m) => ({
              projectId: project.id,
              phase: m.phase as never,
              name: m.name,
              targetDate: addDays(start, m.daysFromStart),
              isGate: m.isGate,
            })),
          });
        }

        if (scaffold.workflowCanvas) {
          await prisma.workflowCanvas.create({
            data: {
              projectId: project.id,
              name: `${name} — AI Pipeline`,
              canvasData: {
                ...(scaffold.workflowCanvas as object),
                viewport: { x: 0, y: 0, scale: 1 },
              },
              createdBy: user.userId,
            },
          });
        }
      } else {
        // Blank project: create empty phase records
        const phases = ["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"];
        await prisma.projectPhaseRecord.createMany({
          data: phases.map((phase) => ({
            projectId: project.id,
            phase: phase as never,
            status: "BACKLOG",
          })),
        });
      }

      await logAudit({
        userId: user.userId,
        action: "CREATE",
        resource: "Project",
        resourceId: project.id,
        after: { name, templateId },
        ipAddress: getClientIp(req),
      });

      return ok(project, undefined, 201);
    } catch (err) {
      return serverError(err);
    }
  },
  "RISK_OFFICER"
);
