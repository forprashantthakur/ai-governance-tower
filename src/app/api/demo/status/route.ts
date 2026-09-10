import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DEMO_ORG_SLUG = "demo-bank-cio";

/** Resolve a count query, or 0 if the table doesn't exist yet on a stale DB. */
async function safe(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

// GET /api/demo/status — tells the CIO demo button whether the separate demo
// organization ("Demo Bank — CIO Walkthrough") already exists and how far its
// seeding got, so the UI can render "Load CIO Demo Data" vs. "Demo data
// loaded — enter demo workspace" without ever touching the caller's own org.
export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const demoOrg = await prisma.organization.findUnique({
      where: { slug: DEMO_ORG_SLUG },
      select: { id: true, name: true },
    });

    if (!demoOrg) {
      return ok({
        exists: false,
        seeded: false,
        organizationId: null as string | null,
        organizationName: null as string | null,
        moduleCounts: null,
      });
    }

    const orgId = demoOrg.id;

    const [
      policies,
      raci,
      aims,
      soa,
      freeAi,
      modelRisk,
      gapAssessments,
      gapFindings,
      controlTests,
      nonConformities,
      capas,
      remediation,
      kriDefinitions,
      kriReadings,
      training,
    ] = await Promise.all([
      safe(() => prisma.policyDocument.count({ where: { organizationId: orgId } })),
      safe(() => prisma.raciAssignment.count({ where: { organizationId: orgId } })),
      safe(() => prisma.aimsClause.count({ where: { organizationId: orgId } })),
      safe(() => prisma.soaControl.count({ where: { organizationId: orgId } })),
      safe(() => prisma.freeAiItem.count({ where: { organizationId: orgId } })),
      safe(() => prisma.modelRiskRecord.count({ where: { organizationId: orgId } })),
      safe(() => prisma.gapAssessment.count({ where: { organizationId: orgId } })),
      safe(() => prisma.gapFinding.count({ where: { assessment: { organizationId: orgId } } })),
      safe(() => prisma.controlTest.count({ where: { organizationId: orgId } })),
      safe(() => prisma.nonConformity.count({ where: { organizationId: orgId } })),
      safe(() => prisma.capa.count({ where: { ncr: { organizationId: orgId } } })),
      safe(() => prisma.remediationItem.count({ where: { organizationId: orgId } })),
      safe(() => prisma.kriDefinition.count({ where: { organizationId: orgId } })),
      safe(() => prisma.kriReading.count({ where: { definition: { organizationId: orgId } } })),
      safe(() => prisma.trainingProgram.count({ where: { organizationId: orgId } })),
    ]);

    const moduleCounts = {
      policies,
      raci,
      aims,
      soa,
      freeAi,
      modelRisk,
      gapAssessments,
      gapFindings,
      controlTests,
      nonConformities,
      capas,
      remediation,
      kriDefinitions,
      kriReadings,
      training,
    };

    // Consider the demo "seeded" once the first module (policies) has rows —
    // seeding runs all modules together, so this is a reliable proxy without
    // requiring every one of the eleven modules to be individually non-empty.
    const seeded = policies > 0;

    return ok({
      exists: true,
      seeded,
      organizationId: orgId as string | null,
      organizationName: demoOrg.name as string | null,
      moduleCounts,
    });
  } catch (err) {
    return serverError(err);
  }
});
