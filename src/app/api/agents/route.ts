import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  modelId: z.string().uuid(),
  systemPrompt: z.string().optional(),
  tools: z.array(z.string()).default([]),
  version: z.string().default("1.0.0"),
  maxTokens: z.number().int().positive().max(128000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/agents
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const status = searchParams.get("status");

    const agents = await prisma.agent.findMany({
      where: {
        ...(modelId && { modelId }),
        ...(status && { status: status as never }),
      },
      include: {
        model: { select: { id: true, name: true, type: true } },
        _count: { select: { promptLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(agents);
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/agents
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const agent = await prisma.agent.create({
      data: parsed.data,
      include: { model: { select: { id: true, name: true } } },
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      resource: "Agent",
      resourceId: agent.id,
      after: agent,
      ipAddress: getClientIp(req),
    });

    return created(agent);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
