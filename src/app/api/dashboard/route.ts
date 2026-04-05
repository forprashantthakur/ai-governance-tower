import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { getCache, setCache } from "@/lib/redis";

// GET /api/dashboard — aggregated KPIs for the main dashboard
export const GET = withAuth(async () => {
  try {
    const cacheKey = "dashboard:kpis";
    const cached = await getCache(cacheKey);
    if (cached) return ok(cached as object);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalModels,
      activeModels,
      riskCounts,
      complianceSummary,
      activeAlerts,
      recentLogs,
      usageTrend,
      topRiskyModels,
    ] = await Promise.all([
      prisma.aIModel.count(),
      prisma.aIModel.count({ where: { status: "ACTIVE" } }),

      // Risk distribution from latest assessments (subquery approach)
      prisma.riskAssessment.findMany({
        orderBy: { createdAt: "desc" },
        distinct: ["modelId"],
        select: { riskLevel: true, overallScore: true },
      }),

      // Compliance pass rate
      prisma.complianceControl.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Unread alerts
      prisma.alert.count({ where: { isRead: false } }),

      // Recent prompt logs
      prisma.promptLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      // Daily usage last 14 days for chart
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("created_at")::text as date, COUNT(*)::bigint as count
        FROM prompt_logs
        WHERE "created_at" >= NOW() - INTERVAL '14 days'
        GROUP BY DATE("created_at")
        ORDER BY date ASC
      `,

      // Top 5 risky models
      prisma.riskAssessment.findMany({
        orderBy: { overallScore: "desc" },
        distinct: ["modelId"],
        take: 5,
        select: {
          overallScore: true,
          riskLevel: true,
          model: { select: { id: true, name: true, type: true, status: true } },
        },
      }),
    ]);

    const riskDistribution = riskCounts.reduce(
      (acc, r) => {
        acc[r.riskLevel] = (acc[r.riskLevel] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgRisk =
      riskCounts.length > 0
        ? riskCounts.reduce((s, r) => s + r.overallScore, 0) / riskCounts.length
        : 0;

    const complianceTotal = complianceSummary.reduce(
      (s, c) => s + c._count.status,
      0
    );
    const compliancePassing =
      complianceSummary.find((c) => c.status === "PASS")?._count.status ?? 0;
    const complianceScore =
      complianceTotal > 0
        ? Math.round((compliancePassing / complianceTotal) * 100)
        : 0;

    const result = {
      kpis: {
        totalModels,
        activeModels,
        avgRiskScore: Math.round(avgRisk * 10) / 10,
        complianceScore,
        activeAlerts,
        promptCallsThisMonth: recentLogs,
      },
      riskDistribution,
      complianceSummary: complianceSummary.map((c) => ({
        status: c.status,
        count: c._count.status,
      })),
      usageTrend: (usageTrend as { date: string; count: bigint }[]).map((u) => ({
        date: u.date,
        calls: Number(u.count),
      })),
      topRiskyModels,
    };

    await setCache(cacheKey, result, 120); // 2-min cache
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
});
