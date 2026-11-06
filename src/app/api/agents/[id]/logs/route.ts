import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { parsePaging } from "@/lib/pagination";
import { ok, notFound, serverError } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/agents/:id/logs
export const GET = withAuth(async (req, { params, organizationId }) => {
  try {
    const agent = await prisma.agent.findFirst({ where: { id: params.id, organizationId }, select: { id: true } });
    if (!agent) return notFound("Agent");

    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePaging(searchParams, { defaultLimit: 20, maxLimit: 100 });
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
}, "AUDITOR");
