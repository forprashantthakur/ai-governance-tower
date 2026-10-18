import { NextRequest } from "next/server";
import { z } from "zod";
import type { KriDefinition, KriReading } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateKriSchema = z.object({
  kriCode: z.string().min(1).max(50),
  name: z.string().min(1).max(300),
  domain: z.enum(["TECHNOLOGY", "CYBER", "AI", "DATA"]),
  description: z.string().max(4000).optional(),
  formula: z.string().max(2000).optional(),
  unit: z.string().min(1).max(20).default("%"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).default("MONTHLY"),
  direction: z.enum(["LOWER_IS_BETTER", "HIGHER_IS_BETTER"]).default("LOWER_IS_BETTER"),
  greenThreshold: z.coerce.number(),
  amberThreshold: z.coerce.number(),
  redThreshold: z.coerce.number(),
  ownerRole: z.string().max(200).optional(),
  reportedTo: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

type DomainKey = "TECHNOLOGY" | "CYBER" | "AI" | "DATA";
type DefinitionWithReadings = KriDefinition & { readings: KriReading[] };

interface DomainStat {
  red: number;
  amber: number;
  green: number;
  total: number;
}

function emptyStats() {
  return {
    total: 0,
    red: 0,
    amber: 0,
    green: 0,
    noData: 0,
    deteriorating: 0,
    byDomain: {
      AI: { red: 0, amber: 0, green: 0, total: 0 },
      CYBER: { red: 0, amber: 0, green: 0, total: 0 },
      DATA: { red: 0, amber: 0, green: 0, total: 0 },
      TECHNOLOGY: { red: 0, amber: 0, green: 0, total: 0 },
    } as Record<DomainKey, DomainStat>,
  };
}

function computeStats(definitions: DefinitionWithReadings[]) {
  const stats = emptyStats();
  stats.total = definitions.length;

  for (const def of definitions) {
    const latest = def.readings[def.readings.length - 1];
    const bucket = stats.byDomain[def.domain as DomainKey];
    bucket.total += 1;

    if (!latest) {
      stats.noData += 1;
      continue;
    }

    if (latest.status === "RED") {
      stats.red += 1;
      bucket.red += 1;
    } else if (latest.status === "AMBER") {
      stats.amber += 1;
      bucket.amber += 1;
    } else {
      stats.green += 1;
      bucket.green += 1;
    }

    if (latest.trend === "DETERIORATING") stats.deteriorating += 1;
  }

  return stats;
}

// GET /api/kri — definitions (with readings) + Board-pack summary stats
export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    let definitions: DefinitionWithReadings[] = [];
    try {
      definitions = await prisma.kriDefinition.findMany({
        where: { organizationId },
        include: { readings: { orderBy: { periodLabel: "asc" } } },
        orderBy: [{ domain: "asc" }, { kriCode: "asc" }],
      });
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully instead of 500
      return ok({ definitions: [], stats: emptyStats() });
    }

    return ok({ definitions, stats: computeStats(definitions) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/kri — create a KRI definition
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const parsed = CreateKriSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.kriDefinition.findFirst({
      where: { organizationId, kriCode: parsed.data.kriCode },
    });
    if (existing) return badRequest(`KRI code '${parsed.data.kriCode}' already exists`);

    const definition = await prisma.kriDefinition.create({
      data: { ...parsed.data, organizationId },
    });

    return created({ ...definition, readings: [] });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
