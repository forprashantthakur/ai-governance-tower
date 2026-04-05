import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, notFound, serverError } from "@/lib/api-response";

// GET /api/agents/:id/logs
export const GET = withAuth(async (req, { params }) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: params.id } });
    if (!agent) return notFound("Agent");

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const flagged = searchParams.get("flagged") === "true";

    const [logs, total] = await Promise.all([
      prisma.promptLog.findMany({
        where: {
          agentId: params.id,
          ...(flagged && { flagged: true }),
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.promptLog.count({
        where: { agentId: params.id, ...(flagged && { flagged: true }) },
      }),
    ]);

    return ok({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(err);
  }
});
