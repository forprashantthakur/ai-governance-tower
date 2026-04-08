import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { fireWebhooks } from "@/lib/n8n-trigger";

export const dynamic = "force-dynamic";

const UpdatePhaseSchema = z.object({
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  plannedDays: z.number().optional(),
  actualDays: z.number().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdatePhaseSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);
    if (parsed.data.progress === 100) {
      data.completedAt = new Date();
      data.completedBy = user.userId;
    }

    const record = await withRetry(() =>
      prisma.projectPhaseRecord.upsert({
        where: {
          projectId_phase: { projectId: params!.id, phase: params!.phase as never },
        },
        update: data,
        create: {
          projectId: params!.id,
          phase: params!.phase as never,
          ...data,
        },
      })
    );

    if (parsed.data.progress === 100) {
      fireWebhooks(params!.id, "PHASE_COMPLETE", {
        phase: params!.phase,
        completedBy: user.userId,
      }).catch(() => {});

      // Advance project currentPhase
      const phaseOrder = ["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"];
      const currentIdx = phaseOrder.indexOf(params!.phase);
      if (currentIdx < phaseOrder.length - 1) {
        const project = await prisma.project.findUnique({
          where: { id: params!.id },
          select: { currentPhase: true },
        });
        if (project?.currentPhase === params!.phase) {
          await prisma.project.update({
            where: { id: params!.id },
            data: { currentPhase: phaseOrder[currentIdx + 1] as never },
          });
        }
      }
    }

    return ok(record);
  } catch (err) {
    return serverError(err);
  }
});
