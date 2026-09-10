import { NextRequest } from "next/server";
import type { KriDefinition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { KRI_CATALOG, evaluateKriStatus, type KriSeed } from "@/lib/frameworks/kri-catalog";

export const dynamic = "force-dynamic";

/** Deterministic PRNG seeded from a string, so re-running the seed produces a stable series. */
function seededRng(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let state = (h >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state >>> 0) / 4294967296;
  };
}

/** The last 6 calendar-month "YYYY-MM" labels ending at the current month, oldest first. */
function last6Periods(): string[] {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  const labels: string[] = [];
  for (let i = 0; i < 6; i++) {
    labels.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return labels;
}

/**
 * A plausible 6-period reading series for one KRI, derived from its own thresholds so the
 * resulting RAG distribution looks realistic — mostly green/amber, with a minority of the
 * catalogue dipping into red for a period or two before recovering.
 */
function generateSeries(def: KriSeed): number[] {
  const rng = seededRng(def.kriCode);
  const { direction, greenThreshold: g, amberThreshold: a, redThreshold: r } = def;
  const lowerBetter = direction === "LOWER_IS_BETTER";
  const span = Math.max(Math.abs(a - g), Math.abs(r - a), 1);
  const step = span * 0.15;

  const hasStress = rng() < 0.25;
  const stressIdx = 2 + Math.floor(rng() * 3); // a mid-series stress period

  let value = lowerBetter ? g * (0.3 + rng() * 0.5) : g + span * (0.05 + rng() * 0.2);

  const upperBound = lowerBetter ? Math.max(r * 1.5, r + span) : g + span * 1.5;
  const boundedUpper = def.unit === "%" ? Math.min(upperBound, 100) : upperBound;

  const values: number[] = [];
  for (let i = 0; i < 6; i++) {
    value += (rng() - 0.5) * 2 * step;

    if (hasStress && i === stressIdx) {
      value = lowerBetter
        ? r + span * (0.1 + rng() * 0.3)
        : Math.max(0, a - span * (0.1 + rng() * 0.25));
    } else if (hasStress && i === stressIdx + 1) {
      value = (g + a) / 2;
    }

    value = Math.min(Math.max(value, 0), boundedUpper);
    values.push(Math.round(value * 10) / 10);
  }
  return values;
}

function commentaryFor(status: "GREEN" | "AMBER" | "RED", def: KriSeed): string {
  if (status === "RED") {
    return `Breach of red threshold. Escalated to ${def.reportedTo} with a remediation plan and target closure date.`;
  }
  if (status === "AMBER") {
    return `Approaching threshold — ${def.ownerRole} monitoring closely with a tracked remediation action.`;
  }
  return `Within tolerance. ${def.ownerRole} confirms no emerging concerns this period.`;
}

async function upsertDefinition(
  organizationId: string,
  seedDef: KriSeed
): Promise<{ definition: KriDefinition; wasCreated: boolean }> {
  const existing = await prisma.kriDefinition.findFirst({
    where: { organizationId, kriCode: seedDef.kriCode },
  });
  if (existing) return { definition: existing, wasCreated: false };

  const definition = await prisma.kriDefinition.create({
    data: {
      organizationId,
      kriCode: seedDef.kriCode,
      name: seedDef.name,
      domain: seedDef.domain,
      description: seedDef.description,
      formula: seedDef.formula,
      unit: seedDef.unit,
      frequency: seedDef.frequency,
      direction: seedDef.direction,
      greenThreshold: seedDef.greenThreshold,
      amberThreshold: seedDef.amberThreshold,
      redThreshold: seedDef.redThreshold,
      ownerRole: seedDef.ownerRole,
      reportedTo: seedDef.reportedTo,
    },
  });
  return { definition, wasCreated: true };
}

// POST /api/kri/seed — idempotently install the standard KRI catalogue + 6 months of demo readings
export const POST = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const periods = last6Periods();
    let definitionsCreated = 0;
    let readingsCreated = 0;

    for (const seedDef of KRI_CATALOG) {
      const { definition, wasCreated } = await upsertDefinition(organizationId, seedDef);
      if (wasCreated) definitionsCreated += 1;

      const existingReadingCount = await prisma.kriReading.count({
        where: { kriDefinitionId: definition.id },
      });
      if (existingReadingCount > 0) continue;

      const values = generateSeries(seedDef);
      let priorValue: number | null = null;

      const rows = periods.map((periodLabel, idx) => {
        const value = values[idx];
        const status = evaluateKriStatus(value, seedDef.direction, seedDef.greenThreshold, seedDef.amberThreshold);

        let trend: "IMPROVING" | "STABLE" | "DETERIORATING" = "STABLE";
        if (priorValue !== null) {
          const improved = seedDef.direction === "LOWER_IS_BETTER" ? value < priorValue : value > priorValue;
          const worsened = seedDef.direction === "LOWER_IS_BETTER" ? value > priorValue : value < priorValue;
          trend = improved ? "IMPROVING" : worsened ? "DETERIORATING" : "STABLE";
        }
        priorValue = value;

        return {
          kriDefinitionId: definition.id,
          periodLabel,
          value,
          status,
          trend,
          commentary: commentaryFor(status, seedDef),
        };
      });

      await prisma.kriReading.createMany({ data: rows, skipDuplicates: true });
      readingsCreated += rows.length;
    }

    return ok({ definitionsCreated, readingsCreated, totalDefinitions: KRI_CATALOG.length });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
