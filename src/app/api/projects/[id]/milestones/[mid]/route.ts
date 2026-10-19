import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { fireWebhooks } from "@/lib/n8n-trigger";
import { recalcProjectHealth } from "@/lib/project-health";
import { findProjectInOrg } from "@/lib/tenant";

async function findMilestone(projectId: string, milestoneId: string, organizationId: string) {
  if (!(await findProjectInOrg(projectId, organizationId))) return null;
  return prisma.milestone.findFirst({ where: { id: milestoneId, projectId } });
}

export const dynamic = "force-dynamic";

const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  isGate: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user, params, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = UpdateMilestoneSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await findMilestone(params!.id, params!.mid, organizationId);
    if (!existing) return notFound("Milestone");
    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.targetDate) data.targetDate = new Date(parsed.data.targetDate);
    if (parsed.data.isGate !== undefined) data.isGate = parsed.data.isGate;
    const completing = parsed.data.completed === true && !existing.completedAt;
    if (completing) {
      data.completedAt = new Date();
      data.completedBy = user.userId;
    }
    if (parsed.data.completed === false && existing.completedAt) {
      data.completedAt = null;
      data.completedBy = null;
    }

    // Conditional update so two concurrent "complete" requests fire the webhook once.
    const res = await withRetry(() =>
      prisma.milestone.updateMany({
        where: { id: existing.id, ...(completing && { completedAt: null }) },
        data,
      })
    );
    const milestone = await prisma.milestone.findFirst({ where: { id: existing.id } });
    if (!milestone) return notFound("Milestone");

    if (completing && res.count === 1) {
      await fireWebhooks(existing.projectId, "MILESTONE_REACHED", {
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        phase: milestone.phase,
      }).catch(() => {});
      await recalcProjectHealth(existing.projectId).catch(() => {});
    }

    return ok(milestone);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await findMilestone(params!.id, params!.mid, organizationId);
    if (!existing) return notFound("Milestone");
    await prisma.milestone.delete({ where: { id: existing.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
