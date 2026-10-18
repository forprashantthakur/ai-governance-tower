import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { ANNEX_A_CONTROLS } from "@/lib/frameworks/iso42001";

export const dynamic = "force-dynamic";

// POST /api/soa/seed — idempotently install the 38 ISO/IEC 42001 Annex A
// controls for this org. Safe to call repeatedly: existing controls (matched
// on the organizationId + controlRef unique constraint) are left untouched so
// any decision/justification already recorded against them is never clobbered.
export const POST = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const before = await prisma.soaControl.count({ where: { organizationId } });

    await prisma.soaControl.createMany({
      data: ANNEX_A_CONTROLS.map((c) => ({
        organizationId,
        controlRef: c.controlRef,
        controlTitle: c.controlTitle,
        objectiveGroup: c.objectiveGroup,
        controlObjective: c.controlObjective,
        ownerRole: c.ownerRole,
      })),
      skipDuplicates: true,
    });

    const after = await prisma.soaControl.count({ where: { organizationId } });

    return ok({ insertedCount: after - before, totalCount: after });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
