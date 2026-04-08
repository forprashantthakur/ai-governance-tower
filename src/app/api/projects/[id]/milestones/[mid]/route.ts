import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { fireWebhooks } from "@/lib/n8n-trigger";
import { recalcProjectHealth } from "@/lib/project-health";

export const dynamic = "force-dynamic";

const UpdateMilestoneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  isGate: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateMilestoneSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.milestone.findUnique({ where: { id: params!.mid } });
    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.targetDate) data.targetDate = new Date(parsed.data.targetDate);
    if (parsed.data.isGate !== undefined) data.isGate = parsed.data.isGate;
    if (parsed.data.completed === true && !existing?.completedAt) {
      data.completedAt = new Date();
      data.completedBy = user.userId;
    }

    const milestone = await withRetry(() =>
      prisma.milestone.update({ where: { id: params!.mid }, data })
    );

    if (parsed.data.completed === true && !existing?.completedAt) {
      fireWebhooks(params!.id, "MILESTONE_REACHED", {
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        phase: milestone.phase,
      }).catch(() => {});
      recalcProjectHealth(params!.id).catch(() => {});
    }

    return ok(milestone);
  } catch (err) {
    return serverError(err);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.milestone.delete({ where: { id: params!.mid } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
});
