import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { evaluateKriStatus, type KriDirectionKey } from "@/lib/frameworks/kri-catalog";

export const dynamic = "force-dynamic";

const ReadingSchema = z.object({
  periodLabel: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodLabel must be in YYYY-MM format"),
  value: z.coerce.number(),
  commentary: z.string().max(2000).optional(),
});

/** Parse a "YYYY-MM" label into integer parts — never round-trip these through Date. */
function parsePeriod(label: string): { year: number; month: number } {
  const [year, month] = label.split("-").map(Number);
  return { year, month };
}

/** The calendar month immediately before the given "YYYY-MM" label, built from string parts. */
function previousPeriodLabel(label: string): string {
  const { year, month } = parsePeriod(label);
  let y = year;
  let m = month - 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// POST /api/kri/:id/readings — record or update a reading for a period
export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const definition = await prisma.kriDefinition.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!definition) return notFound("KRI definition");

    const parsed = ReadingSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { periodLabel, value, commentary } = parsed.data;

    // Status is derived server-side from the definition's thresholds — never trust the client.
    const status = evaluateKriStatus(
      value,
      definition.direction as KriDirectionKey,
      definition.greenThreshold,
      definition.amberThreshold
    );

    // Trend compares against the immediately prior calendar period, if recorded.
    const priorLabel = previousPeriodLabel(periodLabel);
    const prior = await prisma.kriReading.findUnique({
      where: { kriDefinitionId_periodLabel: { kriDefinitionId: definition.id, periodLabel: priorLabel } },
    });

    let trend: "IMPROVING" | "STABLE" | "DETERIORATING" = "STABLE";
    if (prior) {
      const improved = definition.direction === "LOWER_IS_BETTER" ? value < prior.value : value > prior.value;
      const worsened = definition.direction === "LOWER_IS_BETTER" ? value > prior.value : value < prior.value;
      trend = improved ? "IMPROVING" : worsened ? "DETERIORATING" : "STABLE";
    }

    const reading = await prisma.kriReading.upsert({
      where: { kriDefinitionId_periodLabel: { kriDefinitionId: definition.id, periodLabel } },
      create: {
        kriDefinitionId: definition.id,
        periodLabel,
        value,
        status,
        trend,
        commentary,
      },
      update: { value, status, trend, commentary },
    });

    return ok(reading);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
