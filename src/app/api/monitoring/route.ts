import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

// GET /api/monitoring — aggregated metrics
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const days = Math.min(90, parseInt(searchParams.get("days") ?? "7"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = {
      createdAt: { gte: since },
      ...(modelId && { modelId }),
    };

    const [totalCalls, flaggedLogs, avgMetrics, recentLogs, alerts] =
      await Promise.all([
        prisma.promptLog.count({ where }),
        prisma.promptLog.count({ where: { ...where, flagged: true } }),
        prisma.promptLog.aggregate({
          where,
          _avg: {
            latencyMs: true,
            toxicityScore: true,
            accuracyScore: true,
            biasScore: true,
            inputTokens: true,
            outputTokens: true,
          },
        }),
        prisma.promptLog.findMany({
          where: { ...where, flagged: true },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            model: { select: { id: true, name: true } },
            agent: { select: { id: true, name: true } },
          },
        }),
        prisma.alert.findMany({
          where: { isRead: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Daily call volume for chart
    const dailyRaw = await prisma.$queryRaw<
      { date: string; count: bigint }[]
    >`
      SELECT DATE("created_at")::text as date, COUNT(*)::bigint as count
      FROM prompt_logs
      WHERE "created_at" >= ${since}
      ${modelId ? prisma.$queryRaw`AND "model_id" = ${modelId}` : prisma.$queryRaw``}
      GROUP BY DATE("created_at")
      ORDER BY date ASC
    `;

    const dailyVolume = dailyRaw.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));

    return ok({
      summary: {
        totalCalls,
        flaggedCount: flaggedLogs,
        flaggedRate:
          totalCalls > 0 ? ((flaggedLogs / totalCalls) * 100).toFixed(1) : "0",
        avgLatencyMs: Math.round(avgMetrics._avg.latencyMs ?? 0),
        avgToxicity: avgMetrics._avg.toxicityScore?.toFixed(3) ?? "0",
        avgAccuracy: avgMetrics._avg.accuracyScore?.toFixed(3) ?? "0",
        avgBias: avgMetrics._avg.biasScore?.toFixed(3) ?? "0",
        avgInputTokens: Math.round(avgMetrics._avg.inputTokens ?? 0),
        avgOutputTokens: Math.round(avgMetrics._avg.outputTokens ?? 0),
      },
      dailyVolume,
      recentFlagged: recentLogs,
      activeAlerts: alerts,
    });
  } catch (err) {
    return serverError(err);
  }
});
