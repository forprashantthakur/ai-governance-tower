import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const TIERS = ["TIER_1", "TIER_2", "TIER_3"] as const;
const OUTCOMES = ["PASS", "PASS_WITH_CONDITIONS", "FAIL", "PENDING"] as const;

const CreateSchema = z.object({
  modelId: z.string().uuid().optional().nullable(),
  modelName: z.string().min(1).max(300),
  modelOwner: z.string().max(200).optional(),
  businessUnit: z.string().max(200).optional(),
  tier: z.enum(TIERS).default("TIER_2"),
  materialityScore: z.coerce.number().int().min(0).max(100).default(0),
  purpose: z.string().optional(),
  lastValidatedAt: z.string().datetime().optional().nullable(),
  nextValidationDue: z.string().datetime().optional().nullable(),
  validationOutcome: z.enum(OUTCOMES).default("PENDING"),
  validatorName: z.string().max(200).optional(),
  independentReview: z.boolean().default(false),
  conceptualSoundness: z.string().optional(),
  backtestingResult: z.string().optional(),
  benchmarkResult: z.string().optional(),
  ongoingMonitoring: z.string().optional(),
  limitations: z.string().optional(),
  conditions: z.string().optional(),
  openFindings: z.coerce.number().int().min(0).default(0),
});

// GET /api/model-risk
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const tier = searchParams.get("tier") ?? undefined;
    const outcome = searchParams.get("outcome") ?? undefined;
    const overdueOnly = searchParams.get("overdue") === "true";

    const now = new Date();

    const where = {
      organizationId,
      ...(tier && { tier: tier as (typeof TIERS)[number] }),
      ...(outcome && { validationOutcome: outcome as (typeof OUTCOMES)[number] }),
      ...(overdueOnly && { nextValidationDue: { lt: now } }),
    };

    let rows: Awaited<ReturnType<typeof prisma.modelRiskRecord.findMany>> = [];
    let availableModels: { id: string; name: string; type: string }[] = [];

    try {
      [rows, availableModels] = await Promise.all([
        prisma.modelRiskRecord.findMany({
          where,
          include: {
            model: { select: { id: true, name: true, type: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.aIModel.findMany({
          where: { organizationId },
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        }),
      ]);
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully
      return ok({
        rows: [],
        availableModels: [],
        stats: {
          total: 0,
          tier1: 0,
          overdue: 0,
          failed: 0,
          passWithConditions: 0,
          failedOrConditional: 0,
          tier1MissingIndependentReview: 0,
          byTier: { TIER_1: 0, TIER_2: 0, TIER_3: 0 },
          byMonth: [],
        },
      });
    }

    // Stats are computed over the org's full set (not the filtered `rows`) so the
    // summary strip stays stable while the table below is filtered.
    const allRows = await prisma.modelRiskRecord.findMany({
      where: { organizationId },
      select: {
        tier: true,
        nextValidationDue: true,
        validationOutcome: true,
        independentReview: true,
      },
    });

    const byTier = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
    let overdue = 0;
    let failed = 0;
    let passWithConditions = 0;
    let tier1MissingIndependentReview = 0;

    for (const r of allRows) {
      byTier[r.tier] += 1;
      if (r.nextValidationDue && r.nextValidationDue < now) overdue += 1;
      if (r.validationOutcome === "FAIL") failed += 1;
      if (r.validationOutcome === "PASS_WITH_CONDITIONS") passWithConditions += 1;
      if (r.tier === "TIER_1" && !r.independentReview) tier1MissingIndependentReview += 1;
    }

    // Next 6 months validation calendar strip
    const monthBuckets: { key: string; label: string; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthBuckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        count: 0,
      });
    }
    const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]));
    for (const r of allRows) {
      if (!r.nextValidationDue) continue;
      const key = `${r.nextValidationDue.getFullYear()}-${r.nextValidationDue.getMonth()}`;
      const bucket = bucketByKey.get(key);
      if (bucket) bucket.count += 1;
    }

    return ok({
      rows,
      availableModels,
      stats: {
        total: allRows.length,
        tier1: byTier.TIER_1,
        overdue,
        failed,
        passWithConditions,
        failedOrConditional: failed + passWithConditions,
        tier1MissingIndependentReview,
        byTier,
        byMonth: monthBuckets,
      },
    });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/model-risk
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { modelId, lastValidatedAt, nextValidationDue, ...rest } = parsed.data;

    const row = await prisma.modelRiskRecord.create({
      data: {
        ...rest,
        organizationId,
        modelId: modelId || null,
        lastValidatedAt: lastValidatedAt ? new Date(lastValidatedAt) : null,
        nextValidationDue: nextValidationDue ? new Date(nextValidationDue) : null,
      },
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "ModelRiskRecord",
      resourceId: row.id,
      after: row,
      ipAddress: getClientIp(req),
    });

    return created(row);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
