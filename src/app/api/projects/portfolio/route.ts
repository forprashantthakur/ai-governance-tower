import { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const [projects, taskCounts] = await Promise.all([
      withRetry(() =>
        prisma.project.findMany({
          where: { organizationId },
          select: {
            id: true,
            name: true,
            status: true,
            currentPhase: true,
            healthScore: true,
            healthStatus: true,
            updatedAt: true,
            description: true,
            targetDate: true,
            _count: { select: { tasks: true, milestones: true } },
          },
          orderBy: { updatedAt: "desc" },
        })
      ),
      prisma.projectTask.groupBy({ by: ["status"], _count: true }),
    ]);

    const byStatus: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    let totalHealth = 0;
    let atRiskCount = 0;
    let criticalCount = 0;

    for (const p of projects) {
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
      byPhase[p.currentPhase] = (byPhase[p.currentPhase] ?? 0) + 1;
      totalHealth += p.healthScore;
      if (p.healthStatus === "AT_RISK") atRiskCount++;
      if (p.healthStatus === "CRITICAL") criticalCount++;
    }

    const avgHealthScore = projects.length ? Math.round(totalHealth / projects.length) : 100;

    const recentActivity = projects.slice(0, 5).map((p) => ({
      projectId: p.id,
      projectName: p.name,
      action: `Phase: ${p.currentPhase.replace(/_/g, " ")}`,
      at: p.updatedAt.toISOString(),
    }));

    return ok({
      totalProjects: projects.length,
      byStatus,
      byPhase,
      avgHealthScore,
      atRiskCount,
      criticalCount,
      recentActivity,
      projects,
    });
  } catch (err) {
    return serverError(err);
  }
});
