import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { AIMS_CLAUSES } from "@/lib/frameworks/iso42001";

export const dynamic = "force-dynamic";

// POST /api/aims/seed — idempotently install the 27 ISO/IEC 42001 Clause 4–10
// requirements for this org. Safe to call repeatedly: existing clauses (matched
// on the organizationId + clauseNo unique constraint) are left untouched so any
// status/evidence already recorded against them is never clobbered.
export const POST = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const before = await prisma.aimsClause.count({ where: { organizationId } });

    await prisma.aimsClause.createMany({
      data: AIMS_CLAUSES.map((c) => ({
        organizationId,
        clauseNo: c.clauseNo,
        clauseTitle: c.clauseTitle,
        section: c.section,
        requirement: c.requirement,
        ownerRole: c.ownerRole,
      })),
      skipDuplicates: true,
    });

    const after = await prisma.aimsClause.count({ where: { organizationId } });

    return ok({ insertedCount: after - before, totalCount: after });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
