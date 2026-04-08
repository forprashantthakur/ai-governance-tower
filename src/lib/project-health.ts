import { prisma } from "@/lib/prisma";

export async function recalcProjectHealth(projectId: string): Promise<void> {
  try {
    const now = new Date();
    const [tasks, milestones, project] = await Promise.all([
      prisma.projectTask.findMany({ where: { projectId } }),
      prisma.milestone.findMany({ where: { projectId } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { budget: true, startDate: true, createdAt: true } }),
    ]);

    let score = 100;

    // Overdue milestones: -10 each, max -30
    const overdueMilestones = milestones.filter(
      (m) => !m.completedAt && new Date(m.targetDate) < now
    );
    score -= Math.min(overdueMilestones.length * 10, 30);

    // Blocked tasks: -5 each, max -20
    const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
    score -= Math.min(blockedTasks.length * 5, 20);

    // Overdue tasks (dueDate passed and not done): -3 each, max -15
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
    );
    score -= Math.min(overdueTasks.length * 3, 15);

    // No activity in 7 days (no tasks updated recently): -10
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hasRecentActivity = tasks.some(
      (t) => new Date(t.updatedAt) > sevenDaysAgo
    );
    if (tasks.length > 0 && !hasRecentActivity) score -= 10;

    score = Math.max(0, Math.round(score));

    const healthStatus =
      score >= 80 ? "HEALTHY" : score >= 60 ? "AT_RISK" : "CRITICAL";

    await prisma.project.update({
      where: { id: projectId },
      data: { healthScore: score, healthStatus },
    });
  } catch {
    // Non-blocking — health score is best-effort
  }
}
