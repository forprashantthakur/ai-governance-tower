import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { POLICY_CATALOG, RACI_CATALOG } from "@/lib/frameworks/policy-catalog";

export const dynamic = "force-dynamic";

/**
 * Status a freshly-installed reference document starts life in. The apex
 * policy and charter are treated as already Board-approved; a couple of
 * procedures and standards are left mid-cycle so the "Board approval
 * pending" / "In review" KPIs are non-zero on a fresh install, the way a
 * real, partially-matured policy estate would look.
 */
const SEED_STATUS: Record<string, "PUBLISHED" | "APPROVED" | "IN_REVIEW" | "BOARD_APPROVAL_PENDING"> = {
  "AI-POL-001": "PUBLISHED",
  "AI-CHR-001": "PUBLISHED",
  "AI-MAN-001": "APPROVED",
  "AI-PRO-001": "PUBLISHED",
  "AI-PRO-002": "PUBLISHED",
  "AI-PRO-003": "PUBLISHED",
  "AI-PRO-004": "APPROVED",
  "AI-PRO-005": "PUBLISHED",
  "AI-PRO-006": "PUBLISHED",
  "AI-PRO-007": "PUBLISHED",
  "AI-PRO-008": "IN_REVIEW",
  "AI-PRO-009": "PUBLISHED",
  "AI-PRO-010": "PUBLISHED",
  "AI-PRO-011": "BOARD_APPROVAL_PENDING",
  "AI-STD-001": "APPROVED",
  "AI-STD-002": "BOARD_APPROVAL_PENDING",
  "AI-SOP-001": "IN_REVIEW",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function seedStatusFor(docCode: string): "PUBLISHED" | "APPROVED" | "IN_REVIEW" | "BOARD_APPROVAL_PENDING" {
  return SEED_STATUS[docCode] ?? "DRAFT";
}

// POST /api/policies/seed — idempotently install the standard AI governance
// policy framework (17 documents + 19 RACI activities) for this organization.
export const POST = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const [existingDocs, existingActivities] = await Promise.all([
      prisma.policyDocument.findMany({ where: { organizationId }, select: { docCode: true } }),
      prisma.raciAssignment.findMany({ where: { organizationId }, select: { activity: true } }),
    ]);
    const existingDocCodes = new Set(existingDocs.map((d) => d.docCode));
    const existingActivitySet = new Set(existingActivities.map((r) => r.activity));

    const docsToCreate = POLICY_CATALOG.filter((doc) => !existingDocCodes.has(doc.docCode));
    const raciToCreate = RACI_CATALOG.filter((r) => !existingActivitySet.has(r.activity));

    const now = Date.now();

    let documentsCreated = 0;
    if (docsToCreate.length > 0) {
      const result = await prisma.policyDocument.createMany({
        data: docsToCreate.map((doc, i) => ({
          organizationId,
          docCode: doc.docCode,
          title: doc.title,
          type: doc.type,
          status: seedStatusFor(doc.docCode),
          version: "1.0",
          summary: doc.summary,
          ownerRole: doc.ownerRole,
          approverRole: doc.approverRole,
          effectiveFrom: new Date(now - (180 + i * 5) * DAY_MS),
          nextReviewDate: new Date(now + ((i % 6) * 60 + 30) * DAY_MS),
          integratesWith: doc.integratesWith,
          frameworkRefs: doc.frameworkRefs,
        })),
        skipDuplicates: true,
      });
      documentsCreated = result.count;
    }

    let activitiesCreated = 0;
    if (raciToCreate.length > 0) {
      const result = await prisma.raciAssignment.createMany({
        data: raciToCreate.map((r) => ({
          organizationId,
          activity: r.activity,
          lifecyclePhase: r.lifecyclePhase,
          layer: r.layer,
          responsible: r.responsible,
          accountable: r.accountable,
          consulted: r.consulted,
          informed: r.informed,
          sortOrder: r.sortOrder,
        })),
        skipDuplicates: true,
      });
      activitiesCreated = result.count;
    }

    return ok({
      documentsCreated,
      activitiesCreated,
      documentsSkipped: POLICY_CATALOG.length - docsToCreate.length,
      activitiesSkipped: RACI_CATALOG.length - raciToCreate.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation")) {
      return serverError(
        new Error("Database tables not yet created. Run 'npx prisma db push' or redeploy to create the new tables.")
      );
    }
    return serverError(err);
  }
}, "RISK_OFFICER");
