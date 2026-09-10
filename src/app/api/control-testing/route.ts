import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, conflict, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const METHODS = ["INQUIRY", "OBSERVATION", "INSPECTION", "REPERFORMANCE"] as const;
const RESULTS = ["NOT_TESTED", "EFFECTIVE", "PARTIALLY_EFFECTIVE", "INEFFECTIVE"] as const;

const CreateSchema = z.object({
  testRef: z.string().min(1).max(100),
  controlRef: z.string().min(1).max(100),
  controlTitle: z.string().min(1).max(500),
  framework: z.string().min(1).max(100),
  testObjective: z.string().optional(),
  testProcedure: z.string().optional(),
  method: z.enum(METHODS).default("INSPECTION"),
  sampleSize: z.coerce.number().int().min(0).default(0),
  samplesTested: z.coerce.number().int().min(0).default(0),
  exceptions: z.coerce.number().int().min(0).default(0),
  result: z.enum(RESULTS).default("NOT_TESTED"),
  testedBy: z.string().max(200).optional(),
  testedAt: z.string().datetime().optional().nullable(),
  evidence: z.string().optional(),
  conclusion: z.string().optional(),
});

// GET /api/control-testing
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const framework = searchParams.get("framework") ?? undefined;
    const result = searchParams.get("result") ?? undefined;

    const where = {
      organizationId,
      ...(framework && { framework }),
      ...(result && { result: result as (typeof RESULTS)[number] }),
    };

    let rows: Awaited<ReturnType<typeof prisma.controlTest.findMany>> = [];
    try {
      rows = await prisma.controlTest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully
      return ok({ rows: [], stats: { total: 0, tested: 0, effective: 0, partiallyEffective: 0, ineffective: 0, notTested: 0, effectivenessRate: 0, byFramework: [] } });
    }

    // Stats computed over the org's full set (independent of the `framework`/`result` filters
    // used for the table) so the summary strip and framework cards stay stable.
    const allRows = await prisma.controlTest.findMany({
      where: { organizationId },
      select: { framework: true, result: true },
    });

    let effective = 0;
    let partiallyEffective = 0;
    let ineffective = 0;
    let notTested = 0;

    const frameworkMap = new Map<string, { framework: string; total: number; effective: number; partiallyEffective: number; ineffective: number; notTested: number }>();

    for (const r of allRows) {
      if (r.result === "EFFECTIVE") effective += 1;
      else if (r.result === "PARTIALLY_EFFECTIVE") partiallyEffective += 1;
      else if (r.result === "INEFFECTIVE") ineffective += 1;
      else notTested += 1;

      if (!frameworkMap.has(r.framework)) {
        frameworkMap.set(r.framework, { framework: r.framework, total: 0, effective: 0, partiallyEffective: 0, ineffective: 0, notTested: 0 });
      }
      const bucket = frameworkMap.get(r.framework)!;
      bucket.total += 1;
      if (r.result === "EFFECTIVE") bucket.effective += 1;
      else if (r.result === "PARTIALLY_EFFECTIVE") bucket.partiallyEffective += 1;
      else if (r.result === "INEFFECTIVE") bucket.ineffective += 1;
      else bucket.notTested += 1;
    }

    const tested = allRows.length - notTested;

    return ok({
      rows,
      stats: {
        total: allRows.length,
        tested,
        effective,
        partiallyEffective,
        ineffective,
        notTested,
        effectivenessRate: tested > 0 ? Math.round((effective / tested) * 100) : 0,
        byFramework: Array.from(frameworkMap.values()).sort((a, b) => a.framework.localeCompare(b.framework)),
      },
    });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/control-testing
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { testedAt, ...rest } = parsed.data;

    const dupe = await prisma.controlTest.findFirst({
      where: { organizationId, testRef: rest.testRef },
      select: { id: true },
    });
    if (dupe) return conflict(`Test reference "${rest.testRef}" already exists`);

    const row = await prisma.controlTest.create({
      data: {
        ...rest,
        organizationId,
        testedAt: testedAt ? new Date(testedAt) : null,
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "ControlTest",
      resourceId: row.id,
      after: row,
      ipAddress: getClientIp(req),
    });

    return created(row);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
