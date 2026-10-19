import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { fireWebhooks } from "@/lib/n8n-trigger";
import { findProjectInOrg } from "@/lib/tenant";

const PHASE_ORDER = ["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"];

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

export const PATCH = withAuth(async (req: NextRequest, { user, params, organizationId }) => {
  try {
    const project = await findProjectInOrg(params!.id, organizationId);
    if (!project) return notFound("Project");
    if (!PHASE_ORDER.includes(params!.phase)) return badRequest("Unknown phase");

    const existing = await prisma.projectPhaseRecord.findFirst({
      where: { projectId: params!.id, phase: params!.phase as never },
      select: { completedAt: true },
    });
    const body = await req.json();
    const parsed = UpdatePhaseSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);
    // Only a transition into "complete" counts; re-saving at 100% does not re-fire.
    const completing = parsed.data.progress === 100 && !existing?.completedAt;
    if (completing) {
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

    if (completing) {
      await fireWebhooks(params!.id, "PHASE_COMPLETE", {
        phase: params!.phase,
        completedBy: user.userId,
      }).catch(() => {});

      // Advance project currentPhase
      const currentIdx = PHASE_ORDER.indexOf(params!.phase);
      if (currentIdx < PHASE_ORDER.length - 1 && project.currentPhase === params!.phase) {
        await prisma.project.update({
          where: { id: params!.id },
          data: { currentPhase: PHASE_ORDER[currentIdx + 1] as never },
        });
      }
    }

    return ok(record);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
