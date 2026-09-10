import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, conflict, serverError } from "@/lib/api-response";
import type { AimsClause } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"] as const;

const CreateSchema = z.object({
  clauseNo: z.string().min(1).max(20),
  clauseTitle: z.string().min(1).max(300),
  section: z.string().min(1).max(100),
  requirement: z.string().min(1),
  status: z.enum(STATUS_VALUES).optional(),
  maturityLevel: z.number().int().min(0).max(5).optional(),
  ownerRole: z.string().max(200).optional(),
  evidence: z.string().optional(),
  implementationNotes: z.string().optional(),
});

// Weighted implementation-% formula shared with the PATCH handler's stats recompute.
// Not exported: a Next.js route module may only export HTTP handlers and
// route config fields. Any other export fails the build.
function computeAimsStats(clauses: Pick<AimsClause, "status">[]) {
  const total = clauses.length;
  const verified = clauses.filter((c) => c.status === "VERIFIED").length;
  const implemented = clauses.filter((c) => c.status === "IMPLEMENTED").length;
  const inProgress = clauses.filter((c) => c.status === "IN_PROGRESS").length;
  const notStarted = clauses.filter((c) => c.status === "NOT_STARTED").length;
  const weighted = verified * 1 + implemented * 0.75 + inProgress * 0.4;
  const overallPct = total > 0 ? Math.round((weighted / total) * 100) : 0;
  return { total, verified, implemented, inProgress, notStarted, overallPct };
}

// GET /api/aims — all AIMS clauses for the org + rollup stats
export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const clauses = await prisma.aimsClause
      .findMany({
        where: { organizationId },
        orderBy: [{ section: "asc" }, { clauseNo: "asc" }],
      })
      .catch(() => [] as AimsClause[]);

    return ok({ clauses, stats: computeAimsStats(clauses) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/aims — add a custom clause (beyond the seeded 27)
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { clauseNo, ...rest } = parsed.data;

    try {
      const clause = await prisma.aimsClause.create({
        data: { organizationId, clauseNo, ...rest },
      });
      return created(clause);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("Unique constraint")) {
        return conflict(`Clause ${clauseNo} already exists`);
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
