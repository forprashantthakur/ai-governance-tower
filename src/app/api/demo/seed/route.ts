import { NextRequest } from "next/server";
import type {
  PolicyDocStatus,
  AimsClauseStatus,
  SoaDecision,
  SoaImplStatus,
  ComplianceStatus,
  ModelTier,
  ValidationOutcome,
  GapSeverity,
  GapAssessmentStatus,
  TestMethod,
  TestResult,
  NcrType,
  NcrStatus,
  CapaActionType,
  CapaStatus,
  RemediationPriority,
  RemediationStatus,
  RemediationHorizon,
  AudienceGroup,
  TrainingStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { signJwt } from "@/lib/auth/jwt";
import { POLICY_CATALOG, RACI_CATALOG } from "@/lib/frameworks/policy-catalog";
import { AIMS_CLAUSES, ANNEX_A_CONTROLS } from "@/lib/frameworks/iso42001";
import { FREE_AI_CATALOG } from "@/lib/frameworks/free-ai";
import { KRI_CATALOG, evaluateKriStatus, type KriSeed } from "@/lib/frameworks/kri-catalog";

export const dynamic = "force-dynamic";

/**
 * One-click CIO demo data seeding.
 *
 * Seeds a fully-populated, story-consistent demo into a SEPARATE organization
 * ("Demo Bank — CIO Walkthrough") so a walkthrough never touches the calling
 * admin's real tenant data. Every module is idempotent at the module level:
 * if the demo org already has rows for a module, that module is left alone.
 *
 * The numbers below are quoted verbatim in a narrated CIO demo — do not
 * change a status/count assignment without re-checking the totals.
 */

const DEMO_ORG_SLUG = "demo-bank-cio";
const DEMO_ORG_NAME = "Demo Bank — CIO Walkthrough";
const DAY_MS = 24 * 60 * 60 * 1000;

const now = () => Date.now();
const daysAgo = (n: number) => new Date(now() - n * DAY_MS);
const daysFromNow = (n: number) => new Date(now() + n * DAY_MS);

// ============================================================================
// 1. Policies — reuse POLICY_CATALOG (17) + RACI_CATALOG (19)
//    Target: 12 PUBLISHED/APPROVED, 3 IN_REVIEW, 2 BOARD_APPROVAL_PENDING.
//    Exactly 2 with nextReviewDate in the past (AI-MAN-001, AI-PRO-004).
// ============================================================================

const POLICY_STATUS: Record<string, PolicyDocStatus> = {
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
  "AI-PRO-010": "IN_REVIEW",
  "AI-PRO-011": "BOARD_APPROVAL_PENDING",
  "AI-STD-001": "APPROVED",
  "AI-STD-002": "BOARD_APPROVAL_PENDING",
  "AI-SOP-001": "IN_REVIEW",
};

// Days from now for nextReviewDate. Negative = overdue. Exactly two negative.
const POLICY_REVIEW_OFFSET_DAYS: Record<string, number> = {
  "AI-POL-001": 240,
  "AI-CHR-001": 210,
  "AI-MAN-001": -15, // overdue
  "AI-PRO-001": 300,
  "AI-PRO-002": 260,
  "AI-PRO-003": 180,
  "AI-PRO-004": -25, // overdue
  "AI-PRO-005": 220,
  "AI-PRO-006": 190,
  "AI-PRO-007": 170,
  "AI-PRO-008": 90,
  "AI-PRO-009": 200,
  "AI-PRO-010": 45,
  "AI-PRO-011": 30,
  "AI-STD-001": 120,
  "AI-STD-002": 30,
  "AI-SOP-001": 60,
};

async function seedPolicies(organizationId: string) {
  const existing = await prisma.policyDocument.count({ where: { organizationId } });
  if (existing > 0) return { documentsCreated: 0, activitiesCreated: 0, skipped: true };

  await prisma.policyDocument.createMany({
    data: POLICY_CATALOG.map((doc, i) => {
      const status = POLICY_STATUS[doc.docCode] ?? "DRAFT";
      const isLive = status === "PUBLISHED" || status === "APPROVED";
      return {
        organizationId,
        docCode: doc.docCode,
        title: doc.title,
        type: doc.type,
        status,
        version: "1.0",
        summary: doc.summary,
        ownerRole: doc.ownerRole,
        approverRole: doc.approverRole,
        effectiveFrom: isLive ? daysAgo(200 + i * 15) : null,
        nextReviewDate: daysFromNow(POLICY_REVIEW_OFFSET_DAYS[doc.docCode] ?? 90),
        integratesWith: doc.integratesWith,
        frameworkRefs: doc.frameworkRefs,
      };
    }),
    skipDuplicates: true,
  });

  await prisma.raciAssignment.createMany({
    data: RACI_CATALOG.map((r) => ({
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

  return { documentsCreated: POLICY_CATALOG.length, activitiesCreated: RACI_CATALOG.length, skipped: false };
}

// ============================================================================
// 2. AIMS — all 27 AIMS_CLAUSES.
//    Target: 16 IMPLEMENTED/VERIFIED, 7 IN_PROGRESS, 4 NOT_STARTED.
// ============================================================================

const AIMS_STATE: Record<string, { status: AimsClauseStatus; maturity: number }> = {
  "4.1": { status: "VERIFIED", maturity: 5 },
  "4.2": { status: "IN_PROGRESS", maturity: 2 },
  "4.3": { status: "VERIFIED", maturity: 4 },
  "4.4": { status: "VERIFIED", maturity: 5 },
  "5.1": { status: "VERIFIED", maturity: 4 },
  "5.2": { status: "VERIFIED", maturity: 5 },
  "5.3": { status: "IMPLEMENTED", maturity: 4 },
  "6.1.1": { status: "IMPLEMENTED", maturity: 3 },
  "6.1.2": { status: "IMPLEMENTED", maturity: 4 },
  "6.1.3": { status: "IMPLEMENTED", maturity: 3 },
  "6.1.4": { status: "IN_PROGRESS", maturity: 1 },
  "6.2": { status: "IN_PROGRESS", maturity: 2 },
  "6.3": { status: "NOT_STARTED", maturity: 0 },
  "7.1": { status: "IMPLEMENTED", maturity: 4 },
  "7.2": { status: "IN_PROGRESS", maturity: 1 },
  "7.3": { status: "IN_PROGRESS", maturity: 2 },
  "7.4": { status: "NOT_STARTED", maturity: 0 },
  "7.5": { status: "IMPLEMENTED", maturity: 3 },
  "8.1": { status: "IMPLEMENTED", maturity: 4 },
  "8.2": { status: "IN_PROGRESS", maturity: 1 },
  "8.3": { status: "IN_PROGRESS", maturity: 2 },
  "8.4": { status: "NOT_STARTED", maturity: 0 },
  "9.1": { status: "IMPLEMENTED", maturity: 3 },
  "9.2": { status: "IMPLEMENTED", maturity: 4 },
  "9.3": { status: "NOT_STARTED", maturity: 0 },
  "10.1": { status: "IMPLEMENTED", maturity: 3 },
  "10.2": { status: "IMPLEMENTED", maturity: 4 },
};

async function seedAims(organizationId: string) {
  const existing = await prisma.aimsClause.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.aimsClause.createMany({
    data: AIMS_CLAUSES.map((c) => {
      const state = AIMS_STATE[c.clauseNo] ?? { status: "NOT_STARTED" as AimsClauseStatus, maturity: 0 };
      const isDone = state.status === "IMPLEMENTED" || state.status === "VERIFIED";
      return {
        organizationId,
        clauseNo: c.clauseNo,
        clauseTitle: c.clauseTitle,
        section: c.section,
        requirement: c.requirement,
        status: state.status,
        maturityLevel: state.maturity,
        ownerRole: c.ownerRole,
        evidence: isDone
          ? `Evidence pack maintained by ${c.ownerRole}; most recently reviewed against the ${c.section} requirements and retained in the AIMS documentation register.`
          : null,
        implementationNotes:
          state.status === "IN_PROGRESS"
            ? `Implementation under way — owned by ${c.ownerRole}, targeted for completion within the current quarter.`
            : state.status === "NOT_STARTED"
            ? `Not yet started. Scoped into the remediation roadmap.`
            : null,
        lastReviewedAt: state.status === "NOT_STARTED" ? null : daysAgo(20 + state.maturity * 10),
      };
    }),
    skipDuplicates: true,
  });

  return { created: AIMS_CLAUSES.length, skipped: false };
}

// ============================================================================
// 3. SoA — all 38 ANNEX_A_CONTROLS.
//    Target: 32 APPLICABLE (21 IMPLEMENTED, 8 PARTIAL, 3 NOT_IMPLEMENTED),
//    6 NOT_APPLICABLE (all with justification).
// ============================================================================

const SOA_NOT_APPLICABLE: Record<string, string> = {
  "A.6.1.2":
    "The entity procures all production AI systems from third-party vendors or builds them in a single pilot (GenAI Service Assistant, currently in UAT); it does not undertake foundational AI system development at scale. Development-objective setting is delegated to and evidenced within vendor SDLC documentation reviewed under the Third-Party and Vendor AI Procedure. Scoped not applicable to the current production inventory this SoA covers; will be revisited if in-house development expands beyond the pilot.",
  "A.6.1.3":
    "As with A.6.1.2, the entity is an AI system user/deployer for its production inventory rather than a developer of AI systems at scale. Design and development process controls are the vendor's obligation under contract and are assessed through the vendor due-diligence questionnaire, not through an internal development process.",
  "A.6.2.2":
    "Requirements and specification for vendor-sourced AI systems are owned and documented by the vendor as part of the commercial and technical due-diligence pack; the entity does not independently specify AI system requirements for procured systems. Not applicable pending expansion of in-house development.",
  "A.6.2.3":
    "Design and development documentation for procured AI systems resides with the vendor. The entity's own build (GenAI Service Assistant) is tracked under the Model Risk Management dossier rather than this control while it remains in UAT.",
  "A.4.4":
    "No proprietary AI development tooling is maintained. The entity's single in-house build uses the enterprise MLOps platform, which is documented under A.4.5 (system and computing resources); a separate development-tooling resource register is not required until further in-house builds are approved.",
  "A.8.3":
    "External adverse-impact reporting for members of the public who are not customers is out of scope: current AI systems are internal-decisioning or customer-facing only, with no public-facing generative surface. Adverse-impact reporting is provided through the existing customer grievance redressal process and the RBI Ombudsman channel, documented under A.8.5 and A.10.4. This control will be revisited if a public-facing generative AI system is deployed.",
};

const SOA_IMPLEMENTED: string[] = [
  "A.2.2",
  "A.2.3",
  "A.3.2",
  "A.4.2",
  "A.4.3",
  "A.4.5",
  "A.5.2",
  "A.5.3",
  "A.5.4",
  "A.6.2.4",
  "A.6.2.5",
  "A.6.2.6",
  "A.6.2.7",
  "A.7.2",
  "A.7.3",
  "A.7.4",
  "A.7.6",
  "A.8.2",
  "A.9.2",
  "A.9.4",
  "A.10.4",
];
const SOA_PARTIAL: string[] = [
  "A.4.6",
  "A.6.2.8",
  "A.7.5",
  "A.8.5",
  "A.9.3",
  "A.2.4",
  "A.3.3",
  "A.10.2",
];
const SOA_NOT_IMPLEMENTED: string[] = ["A.5.5", "A.8.4", "A.10.3"];

function soaImplStatus(controlRef: string): SoaImplStatus {
  if (SOA_IMPLEMENTED.includes(controlRef)) return "IMPLEMENTED";
  if (SOA_PARTIAL.includes(controlRef)) return "PARTIAL";
  return "NOT_IMPLEMENTED";
}

function soaSummary(controlRef: string, status: SoaImplStatus, title: string): string {
  if (status === "IMPLEMENTED") {
    return `Implemented and evidenced through the AI Governance Policy Framework and current operating practice for "${title}".`;
  }
  if (status === "PARTIAL") {
    return `Partially implemented — core practice exists for "${title}" but evidence and coverage are inconsistent across business units; tracked on the remediation roadmap.`;
  }
  return `Not yet implemented for "${title}". Scheduled via the remediation roadmap with an owner and target date.`;
}

async function seedSoa(organizationId: string) {
  const existing = await prisma.soaControl.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.soaControl.createMany({
    data: ANNEX_A_CONTROLS.map((c) => {
      const isNA = c.controlRef in SOA_NOT_APPLICABLE;
      const decision: SoaDecision = isNA ? "NOT_APPLICABLE" : "APPLICABLE";
      const implStatus: SoaImplStatus = isNA ? "NOT_IMPLEMENTED" : soaImplStatus(c.controlRef);
      return {
        organizationId,
        controlRef: c.controlRef,
        controlTitle: c.controlTitle,
        objectiveGroup: c.objectiveGroup,
        controlObjective: c.controlObjective,
        decision,
        justification: isNA ? SOA_NOT_APPLICABLE[c.controlRef] : null,
        implStatus,
        implementationSummary: isNA ? null : soaSummary(c.controlRef, implStatus, c.controlTitle),
        ownerRole: c.ownerRole,
        linkedPolicyCodes: [],
        lastReviewedAt: daysAgo(30),
      };
    }),
    skipDuplicates: true,
  });

  return { created: ANNEX_A_CONTROLS.length, skipped: false };
}

// ============================================================================
// 4. RBI FREE-AI — all 33 FREE_AI_CATALOG items.
//    Target: 14 PASS, 9 PARTIAL, 5 FAIL, 5 PENDING_REVIEW.
// ============================================================================

const FREE_AI_STATUS: Record<string, ComplianceStatus> = {
  "SUTRA-1": "PASS",
  "SUTRA-2": "PASS",
  "SUTRA-3": "PARTIAL",
  "SUTRA-4": "PASS",
  "SUTRA-5": "PASS",
  "SUTRA-6": "PARTIAL",
  "SUTRA-7": "FAIL",
  "REC-14": "PASS",
  "REC-15": "PASS",
  "REC-16": "PASS",
  "REC-17": "PARTIAL",
  "REC-18": "PARTIAL",
  "REC-19": "PASS",
  "REC-20": "FAIL",
  "REC-21": "FAIL",
  "REC-22": "FAIL",
  "REC-23": "PASS",
  "REC-24": "PARTIAL",
  "REC-25": "PASS",
  "REC-26": "PENDING_REVIEW",
  "REC-1": "PENDING_REVIEW",
  "REC-2": "PASS",
  "REC-3": "PENDING_REVIEW",
  "REC-4": "FAIL",
  "REC-5": "PARTIAL",
  "REC-6": "PASS",
  "REC-7": "PARTIAL",
  "REC-8": "PENDING_REVIEW",
  "REC-9": "PASS",
  "REC-10": "PASS",
  "REC-11": "PENDING_REVIEW",
  "REC-12": "PARTIAL",
  "REC-13": "PARTIAL",
};

function freeAiEvidence(status: ComplianceStatus, title: string): { evidence: string | null; gapNotes: string | null } {
  if (status === "PASS") {
    return { evidence: `Evidenced through the AI Governance Policy Framework and current operating practice for "${title}".`, gapNotes: null };
  }
  if (status === "PARTIAL") {
    return { evidence: `Partial coverage in place for "${title}"; see gap notes.`, gapNotes: `Practice exists but is not yet fully evidenced or consistently applied across all AI systems; tracked on the remediation roadmap.` };
  }
  if (status === "FAIL") {
    return { evidence: null, gapNotes: `Not yet met for "${title}". Raised as a finding in the RBI FREE-AI Alignment Review and carried on the remediation roadmap.` };
  }
  return { evidence: null, gapNotes: `Not yet assessed — primarily a regulator or sector-body owned recommendation; monitored for readiness rather than self-assessed as an RE obligation.` };
}

async function seedFreeAi(organizationId: string) {
  const existing = await prisma.freeAiItem.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.freeAiItem.createMany({
    data: FREE_AI_CATALOG.map((item) => {
      const status = FREE_AI_STATUS[item.itemCode] ?? "PENDING_REVIEW";
      const { evidence, gapNotes } = freeAiEvidence(status, item.title);
      return {
        organizationId,
        itemCode: item.itemCode,
        itemType: item.itemType,
        pillar: item.pillar,
        title: item.title,
        description: item.description,
        applicability: item.applicability,
        status,
        ownerRole: item.ownerRole,
        evidence,
        gapNotes,
        targetDate: status === "FAIL" || status === "PARTIAL" ? daysFromNow(90) : null,
      };
    }),
    skipDuplicates: true,
  });

  return { created: FREE_AI_CATALOG.length, skipped: false };
}

// ============================================================================
// 5. KRI — all 17 KRI_CATALOG definitions, 6 months of readings each
//    (periods computed as the 6 calendar months ending this month).
//    Target latest-reading mix: 3 RED, 5 AMBER, 9 GREEN, exactly 2 DETERIORATING.
//    Series are hand-picked so evaluateKriStatus() lands on the target band —
//    status itself is always computed, never hand-set.
// ============================================================================

/** The 6 calendar-month "YYYY-MM" labels ending at the current month, oldest first. */
function last6Periods(): string[] {
  const d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
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

// Oldest → newest. Only the last two values matter for the latest reading's
// status/trend; earlier values just give the sparkline a plausible shape.
const DEMO_KRI_SERIES: Record<string, number[]> = {
  "AI-KRI-01": [3, 4, 5, 7, 12, 30], // RED, DETERIORATING (models overdue for revalidation spiking)
  "AI-KRI-02": [0, 0, 1, 1, 1, 1], // AMBER, stable
  "AI-KRI-03": [1, 1, 2, 2, 2, 2], // AMBER, stable
  "AI-KRI-04": [0, 0, 0, 0, 0, 0], // GREEN, stable
  "AI-KRI-05": [90, 92, 94, 96, 97, 97], // GREEN, stable
  "AI-KRI-06": [6, 8, 10, 12, 14, 14], // RED, stable
  "CY-KRI-01": [15, 18, 22, 26, 30, 30], // RED, stable
  "CY-KRI-02": [80, 60, 45, 35, 30, 30], // GREEN, stable
  "CY-KRI-03": [4, 3, 3, 2, 2, 2], // AMBER, stable (recovered from an earlier spike)
  "DT-KRI-01": [8, 6, 5, 4, 3, 3], // GREEN, stable
  "DT-KRI-02": [0, 0, 0, 0, 0, 1], // AMBER, DETERIORATING (consent-basis breach just appeared)
  "DT-KRI-03": [3, 2, 2, 1, 1, 1], // GREEN, stable
  "DT-KRI-04": [85, 87, 89, 90, 92, 92], // GREEN, stable
  "TE-KRI-01": [99.2, 99.4, 99.6, 99.7, 99.8, 99.8], // GREEN, stable
  "TE-KRI-02": [7, 6, 5, 4, 4, 4], // GREEN, stable
  "TE-KRI-03": [45, 50, 53, 55, 55, 55], // AMBER, stable
  "TE-KRI-04": [15, 12, 10, 9, 8, 8], // GREEN, stable
};

function kriCommentary(status: "GREEN" | "AMBER" | "RED", def: KriSeed): string {
  if (status === "RED") {
    return `Breach of red threshold. Escalated to ${def.reportedTo} with a remediation plan and target closure date.`;
  }
  if (status === "AMBER") {
    return `Approaching threshold — ${def.ownerRole} monitoring closely with a tracked remediation action.`;
  }
  return `Within tolerance. ${def.ownerRole} confirms no emerging concerns this period.`;
}

async function seedKri(organizationId: string) {
  const existingDefs = await prisma.kriDefinition.count({ where: { organizationId } });
  if (existingDefs > 0) return { definitionsCreated: 0, readingsCreated: 0, skipped: true };

  const periods = last6Periods();
  let definitionsCreated = 0;
  let readingsCreated = 0;

  for (const seedDef of KRI_CATALOG) {
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
    definitionsCreated += 1;

    const values = DEMO_KRI_SERIES[seedDef.kriCode] ?? [0, 0, 0, 0, 0, 0];
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
        commentary: kriCommentary(status, seedDef),
      };
    });

    await prisma.kriReading.createMany({ data: rows, skipDuplicates: true });
    readingsCreated += rows.length;
  }

  return { definitionsCreated, readingsCreated, skipped: false };
}

// ============================================================================
// 6. Model Risk Management — 12 fresh, hand-authored records.
//    Target: 4 TIER_1, 5 TIER_2, 3 TIER_3. 9 validated (PASS /
//    PASS_WITH_CONDITIONS), 1 FAIL, 2 PENDING. Exactly 2 with
//    nextValidationDue in the past (Early Warning Signals, Customer Churn).
// ============================================================================

interface ModelRiskSeed {
  modelName: string;
  modelOwner: string;
  businessUnit: string;
  tier: ModelTier;
  materialityScore: number;
  purpose: string;
  lastValidatedAt: Date | null;
  nextValidationDue: Date;
  validationOutcome: ValidationOutcome;
  validatorName: string | null;
  independentReview: boolean;
  conceptualSoundness: string;
  backtestingResult: string;
  benchmarkResult: string;
  ongoingMonitoring: string;
  limitations: string;
  conditions: string | null;
  openFindings: number;
}

const MODEL_RISK_RECORDS: ModelRiskSeed[] = [
  {
    modelName: "Retail Credit Scorecard",
    modelOwner: "Head of Retail Credit",
    businessUnit: "Retail Banking",
    tier: "TIER_1",
    materialityScore: 92,
    purpose:
      "Bureau-and-application-data scorecard used to underwrite unsecured retail lending decisions and set risk-based pricing.",
    lastValidatedAt: daysAgo(200),
    nextValidationDue: daysFromNow(165),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Logistic regression scorecard with WOE-binned bureau, income and behavioural variables. Variable selection and monotonicity constraints were reviewed and found consistent with credit risk theory and RBI fair-lending expectations.",
    backtestingResult:
      "12-month out-of-time back-test shows a Gini of 68.4 against a 65 minimum threshold, with a population stability index of 0.06 — within the acceptable band.",
    benchmarkResult:
      "Benchmarked against the prior-generation scorecard and a challenger XGBoost model; the production scorecard stays within 2 Gini points of the challenger while retaining full explainability.",
    ongoingMonitoring:
      "Monthly PSI, Gini and approval-rate dashboards reviewed by Model Risk; no drift breaches in the last two quarters.",
    limitations:
      "Performance for thin-file applicants with under six months of bureau history is not separately validated and is flagged for the next review cycle.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Loan Underwriting Engine",
    modelOwner: "Head of Retail Credit",
    businessUnit: "Retail Banking",
    tier: "TIER_1",
    materialityScore: 90,
    purpose:
      "Rules-plus-ML underwriting engine combining the credit scorecard output with affordability and fraud checks for secured and unsecured loan decisioning.",
    lastValidatedAt: daysAgo(150),
    nextValidationDue: daysFromNow(215),
    validationOutcome: "PASS_WITH_CONDITIONS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Ensemble of the retail scorecard, an affordability rules engine and a gradient-boosted override model. Override logic was reviewed against the Human Oversight and Override Procedure.",
    backtestingResult:
      "Back-testing shows acceptable discrimination (Gini 61.2) but a 4.1% override rate exceeding the 3% internal tolerance, concentrated in one regional cluster.",
    benchmarkResult:
      "Outcomes benchmarked against manual underwriting decisions on a stratified sample; directional agreement of 91%.",
    ongoingMonitoring:
      "Weekly override-rate monitoring introduced as a validation condition; results reported to the Head of Model Risk.",
    limitations:
      "Override justification narratives are inconsistently captured, limiting root-cause analysis of the elevated override rate.",
    conditions:
      "Approved subject to monthly override-rate reporting until the rate returns below 3%, and a targeted review of the regional override cluster within 90 days.",
    openFindings: 2,
  },
  {
    modelName: "AML Transaction Monitor",
    modelOwner: "Head of Financial Crime Compliance",
    businessUnit: "Compliance",
    tier: "TIER_1",
    materialityScore: 88,
    purpose:
      "Unsupervised anomaly detection and rules hybrid flagging potentially suspicious transaction patterns for AML investigation.",
    lastValidatedAt: daysAgo(90),
    nextValidationDue: daysFromNow(275),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Combines rule-based typologies mandated by AML policy with an unsupervised clustering layer for novel pattern detection; typology coverage is mapped to FIU-IND reporting categories.",
    backtestingResult:
      "Back-tested alert-to-SAR conversion rate of 8.2%, consistent with the industry benchmark range; false-negative testing against a labelled historical case set found no material misses.",
    benchmarkResult:
      "Benchmarked against the vendor's reference implementation; alert volumes and typology coverage are materially aligned.",
    ongoingMonitoring:
      "Daily alert-volume and monthly conversion-rate monitoring, with a quarterly typology tuning review alongside Financial Crime Compliance.",
    limitations:
      "The clustering layer has not been separately validated for adversarial structuring patterns designed to stay under detection thresholds.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Fraud Detection Engine",
    modelOwner: "Head of Fraud Risk",
    businessUnit: "Digital Payments",
    tier: "TIER_1",
    materialityScore: 89,
    purpose: "Real-time scoring of card and digital payment transactions for fraud risk at point of authorisation.",
    lastValidatedAt: daysAgo(60),
    nextValidationDue: daysFromNow(305),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Gradient-boosted model on device, behavioural and transaction-velocity features, with a sub-200ms scoring SLA validated against production latency logs.",
    backtestingResult:
      "Back-testing shows precision of 34% and recall of 81% at the production threshold, in line with the approved risk appetite for false-positive customer friction.",
    benchmarkResult:
      "Benchmarked quarterly against the card network's fraud score; the production model outperforms on recall for first-party fraud.",
    ongoingMonitoring:
      "Real-time dashboard with daily precision/recall tracking and an automatic alert to the Head of AI Operations on threshold breach.",
    limitations:
      "Limited training data for emerging QR-code fraud typologies; an interim rule-based supplement is in place pending retraining.",
    conditions: null,
    openFindings: 1,
  },
  {
    modelName: "KYC Document Verifier",
    modelOwner: "Head of Digital Onboarding",
    businessUnit: "Retail Banking",
    tier: "TIER_2",
    materialityScore: 68,
    purpose: "OCR and computer-vision model extracting and validating identity document fields during digital onboarding.",
    lastValidatedAt: daysAgo(140),
    nextValidationDue: daysFromNow(220),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Combines a document-classification CNN with field-level OCR and a liveness/tamper-detection layer; design was reviewed against UIDAI and RBI KYC master direction requirements.",
    backtestingResult:
      "Field extraction accuracy of 97.8% and tamper-detection recall of 92% on the annual validation sample, both above internal thresholds.",
    benchmarkResult:
      "Benchmarked against the previous-generation vendor OCR engine; extraction accuracy improved by 3.4 percentage points.",
    ongoingMonitoring: "Monthly manual-review-queue rate tracked as a proxy for model confidence degradation.",
    limitations: "Accuracy for non-standard or damaged documents outside the training distribution is not separately quantified.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Collections Propensity",
    modelOwner: "Head of Collections",
    businessUnit: "Retail Banking",
    tier: "TIER_2",
    materialityScore: 55,
    purpose:
      "Predicts propensity to cure or default for delinquent accounts to prioritise collections treatment and channel.",
    lastValidatedAt: daysAgo(170),
    nextValidationDue: daysFromNow(195),
    validationOutcome: "PASS_WITH_CONDITIONS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Random-forest propensity model on payment-history and bureau-refresh features; treatment allocation logic was reviewed for consistency with the Fair Practices Code.",
    backtestingResult:
      "Back-tested lift of 2.1x over random allocation in the top decile, though calibration drift was observed in the bottom two deciles.",
    benchmarkResult:
      "Benchmarked against the legacy rules-based collections segmentation; the propensity model shows materially better prioritisation.",
    ongoingMonitoring:
      "Quarterly calibration review added as a validation condition pending recalibration of the lower deciles.",
    limitations:
      "The model was trained on a pre-pandemic delinquency distribution and has not been fully revalidated against recent macro conditions.",
    conditions:
      "Approved subject to bottom-decile recalibration within two quarters and interim manual override of treatment for those accounts.",
    openFindings: 2,
  },
  {
    modelName: "Market Risk VaR",
    modelOwner: "Head of Market Risk",
    businessUnit: "Treasury",
    tier: "TIER_2",
    materialityScore: 60,
    purpose: "Historical-simulation Value-at-Risk model for the treasury trading book, used for daily risk limit monitoring.",
    lastValidatedAt: daysAgo(110),
    nextValidationDue: daysFromNow(255),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Standard historical-simulation VaR with a 250-day look-back window; methodology is consistent with RBI trading book capital guidelines.",
    backtestingResult:
      "Kupiec back-test over the trailing 12 months shows 3 exceptions against a 99% confidence band, within the regulatory green-zone tolerance.",
    benchmarkResult: "Cross-checked against a parametric VaR estimate; results are directionally consistent with no material divergence.",
    ongoingMonitoring:
      "Daily exception tracking with escalation to Market Risk on any breach of the amber-zone exception count.",
    limitations:
      "The look-back window may understate tail risk in a sustained low-volatility regime; stress-VaR supplements this limitation.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Customer Churn",
    modelOwner: "Head of Customer Analytics",
    businessUnit: "Retail Banking",
    tier: "TIER_3",
    materialityScore: 32,
    purpose:
      "Predicts likelihood of relationship attrition to prioritise retention outreach for mass-market retail customers.",
    lastValidatedAt: null,
    nextValidationDue: daysAgo(20), // overdue
    validationOutcome: "PENDING",
    validatorName: null,
    independentReview: false,
    conceptualSoundness:
      "Gradient-boosted attrition model on product holding, transaction and engagement features; an initial conceptual review is complete with no material concerns raised.",
    backtestingResult:
      "Formal back-testing is scheduled for the current validation cycle; a preliminary sample review shows lift of 1.6x in the top decile, to be confirmed.",
    benchmarkResult:
      "Benchmarking against the marketing team's heuristic churn flags is planned as part of the validation currently under way.",
    ongoingMonitoring: "Not yet in scope for ongoing monitoring pending completion of the initial validation.",
    limitations: "Full independent validation has not yet been completed; findings to date are preliminary.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Early Warning Signals",
    modelOwner: "Head of Corporate Credit Risk",
    businessUnit: "Corporate & MSME Banking",
    tier: "TIER_2",
    materialityScore: 74,
    purpose:
      "Predicts early-stage credit deterioration on corporate and MSME accounts to trigger pre-emptive risk management action.",
    lastValidatedAt: daysAgo(380),
    nextValidationDue: daysAgo(20), // overdue
    validationOutcome: "FAIL",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Logistic model on financial-statement ratios and banking-behaviour signals. The conceptual soundness review found the feature set does not adequately capture the qualitative early-warning triggers required by RBI's EWS framework.",
    backtestingResult:
      "Back-testing shows a false-negative rate of 22% against confirmed slippage cases in the validation sample, breaching the 15% tolerance.",
    benchmarkResult:
      "Underperforms the manual relationship-manager flagging process on the same account sample, which is the basis for the fail outcome.",
    ongoingMonitoring:
      "Monitoring suspended for new EWS triggers pending remediation; existing flags continue to route through manual review as a compensating control.",
    limitations:
      "The model does not currently incorporate unstructured data — auditor qualifications, rating-agency commentary — identified as material by the validation team.",
    conditions: null,
    openFindings: 5,
  },
  {
    modelName: "Cheque OCR",
    modelOwner: "Head of Payments Operations",
    businessUnit: "Operations",
    tier: "TIER_3",
    materialityScore: 28,
    purpose: "Optical character recognition for cheque MICR and courtesy-amount fields to automate cheque truncation processing.",
    lastValidatedAt: daysAgo(95),
    nextValidationDue: daysFromNow(550),
    validationOutcome: "PASS",
    validatorName: "Independent Validation Unit",
    independentReview: true,
    conceptualSoundness:
      "Mature, narrowly-scoped CNN-based OCR pipeline; the conceptual review confirms fitness for purpose given the constrained, standardised input format.",
    backtestingResult: "Field-level accuracy of 99.1% on the annual sample, comfortably above the 98% threshold.",
    benchmarkResult: "Benchmarked against the clearing house's reference accuracy statistics; performance is in line with sector norms.",
    ongoingMonitoring: "Monthly straight-through-processing rate tracked as the primary monitoring metric.",
    limitations:
      "Accuracy degrades on handwritten cheques from a small number of legacy account holders; a manual exception queue is in place.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "GenAI Service Assistant",
    modelOwner: "Head of AI Engineering",
    businessUnit: "Customer Service",
    tier: "TIER_2",
    materialityScore: 50,
    purpose:
      "Retrieval-augmented generative assistant for customer service agents, drafting responses to policy and product queries for agent review before sending.",
    lastValidatedAt: null,
    nextValidationDue: daysFromNow(60),
    validationOutcome: "PENDING",
    validatorName: null,
    independentReview: false,
    conceptualSoundness:
      "RAG architecture over an approved knowledge base with an agent-in-the-loop review before any customer-facing output; the initial design review is complete.",
    backtestingResult:
      "Response-accuracy sampling against the knowledge base is in progress as part of the pre-production validation currently under way in UAT.",
    benchmarkResult:
      "Not yet benchmarked; comparison against the existing scripted-response tool is planned prior to the production go/no-go decision.",
    ongoingMonitoring: "Guardrail and hallucination-rate monitoring is designed but not yet active pending production deployment.",
    limitations:
      "Adversarial and prompt-injection testing under the AI Security and Adversarial Resilience Standard has not yet been completed.",
    conditions: null,
    openFindings: 0,
  },
  {
    modelName: "Vendor Credit Bureau Model",
    modelOwner: "Head of Vendor Management",
    businessUnit: "Retail Banking",
    tier: "TIER_3",
    materialityScore: 40,
    purpose: "Third-party bureau-hosted credit risk score consumed via API as a supplementary input to the retail scorecard.",
    lastValidatedAt: daysAgo(200),
    nextValidationDue: daysFromNow(165),
    validationOutcome: "PASS_WITH_CONDITIONS",
    validatorName: "Independent Validation Unit",
    independentReview: false,
    conceptualSoundness:
      "Vendor-provided model; conceptual soundness is assessed via the vendor's methodology whitepaper and the third-party AI due-diligence questionnaire rather than full internal model access.",
    backtestingResult:
      "Back-testing is limited to outcome-level validation on the entity's own portfolio, which shows acceptable rank-ordering; full internal back-testing is not possible given no access to the underlying model.",
    benchmarkResult: "Benchmarked against the in-house scorecard for the overlapping population; scores are directionally consistent.",
    ongoingMonitoring:
      "Quarterly score-stability monitoring on the consumed API output; vendor SLA monitored under the Third-Party AI Procedure.",
    limitations:
      "No access to the vendor's internal model logic or training data limits the depth of independent validation achievable.",
    conditions: "Approved for continued use subject to annual renewal of the vendor's independent audit attestation and quarterly score-stability review.",
    openFindings: 1,
  },
];

async function seedModelRisk(organizationId: string) {
  const existing = await prisma.modelRiskRecord.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.modelRiskRecord.createMany({
    data: MODEL_RISK_RECORDS.map((m) => ({
      organizationId,
      modelName: m.modelName,
      modelOwner: m.modelOwner,
      businessUnit: m.businessUnit,
      tier: m.tier,
      materialityScore: m.materialityScore,
      purpose: m.purpose,
      lastValidatedAt: m.lastValidatedAt,
      nextValidationDue: m.nextValidationDue,
      validationOutcome: m.validationOutcome,
      validatorName: m.validatorName,
      independentReview: m.independentReview,
      conceptualSoundness: m.conceptualSoundness,
      backtestingResult: m.backtestingResult,
      benchmarkResult: m.benchmarkResult,
      ongoingMonitoring: m.ongoingMonitoring,
      limitations: m.limitations,
      conditions: m.conditions,
      openFindings: m.openFindings,
    })),
  });

  return { created: MODEL_RISK_RECORDS.length, skipped: false };
}

// ============================================================================
// 7. Gap Assessment — 2 assessments, 24 findings total, exactly 3 CRITICAL
//    with maturityCurrent < maturityTarget. overallScore is recomputed from
//    the findings using the same formula as
//    src/app/api/gap-assessment/[id]/findings/route.ts, never hand-set.
// ============================================================================

interface GapFindingSeed {
  requirementRef: string;
  requirementTitle: string;
  currentState: string;
  desiredState: string;
  gapDescription: string;
  severity: GapSeverity;
  maturityCurrent: number;
  maturityTarget: number;
  recommendation: string;
  ownerRole: string;
}

const ISO42001_FINDINGS: GapFindingSeed[] = [
  {
    requirementRef: "6.1.4",
    requirementTitle: "AI system impact assessment",
    currentState: "Impact assessments are performed ad hoc for a minority of High-tier use cases.",
    desiredState: "Every High/Critical tier AI system has a completed, retained impact assessment before deployment.",
    gapDescription: "No standardised impact-assessment template or mandatory gate exists in the intake workflow.",
    severity: "CRITICAL",
    maturityCurrent: 1,
    maturityTarget: 4,
    recommendation: "Adopt the AI System Impact Assessment Procedure as a mandatory gate for High/Critical tier use cases.",
    ownerRole: "Head of Compliance",
  },
  {
    requirementRef: "A.5.5",
    requirementTitle: "Assessing societal impacts of AI systems",
    currentState: "Individual-level impact is assessed; societal-level assessment is not performed.",
    desiredState: "A documented societal impact assessment methodology is applied to Critical-tier AI systems.",
    gapDescription: "No methodology or owner currently assigned for societal-level impact assessment.",
    severity: "CRITICAL",
    maturityCurrent: 0,
    maturityTarget: 3,
    recommendation: "Define a societal impact assessment methodology and pilot it on the two Critical-tier AI systems.",
    ownerRole: "Head of Compliance",
  },
  {
    requirementRef: "9.3",
    requirementTitle: "Management review",
    currentState: "No AIMS-specific management review has yet been convened.",
    desiredState: "Top management reviews AIMS performance at planned intervals, minuted and actioned.",
    gapDescription: "Management review is not yet scheduled as a standing agenda item.",
    severity: "HIGH",
    maturityCurrent: 0,
    maturityTarget: 3,
    recommendation: "Schedule the first AIMS management review with the Board Risk Committee this quarter.",
    ownerRole: "Board Risk Committee",
  },
  {
    requirementRef: "A.8.4",
    requirementTitle: "Communication of incidents",
    currentState: "Incident communication is handled case-by-case with no documented plan or SLA.",
    desiredState: "A documented incident communication plan with defined SLAs exists and is tested.",
    gapDescription: "No standard runbook; the recent control test of this area was assessed ineffective.",
    severity: "HIGH",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Publish the AI incident communication runbook and run a tabletop exercise.",
    ownerRole: "Head of Operational Risk",
  },
  {
    requirementRef: "A.10.3",
    requirementTitle: "Suppliers",
    currentState: "Vendor AI due diligence is performed for new contracts but not evidenced consistently.",
    desiredState: "Every AI vendor relationship has a current, evidenced due-diligence and oversight record.",
    gapDescription: "One recent procurement lacked retained due-diligence evidence, identified via control testing.",
    severity: "HIGH",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Retrofit the missing evidence and add a completeness check to the procurement checklist.",
    ownerRole: "Head of Vendor Management",
  },
  {
    requirementRef: "7.4",
    requirementTitle: "Communication",
    currentState: "No formal internal/external AIMS communication plan exists.",
    desiredState: "A documented communication plan defines what, when, how and with whom AIMS matters are communicated.",
    gapDescription: "Communication currently happens informally through existing risk committee channels only.",
    severity: "HIGH",
    maturityCurrent: 0,
    maturityTarget: 2,
    recommendation: "Draft an AIMS communication plan covering the Board, staff and regulators.",
    ownerRole: "Head of Corporate Communications",
  },
  {
    requirementRef: "A.7.5",
    requirementTitle: "Data provenance",
    currentState: "Provenance is recorded for most new datasets but not backfilled for legacy training data.",
    desiredState: "Every dataset feeding a production AI system has a recorded, current provenance entry.",
    gapDescription: "Three Tier 1 training datasets lack source-system lineage metadata, identified via control testing.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Automate lineage capture at ingestion and backfill the three affected datasets.",
    ownerRole: "Chief Data Officer",
  },
  {
    requirementRef: "6.3",
    requirementTitle: "Planning of changes",
    currentState: "Changes to the AIMS are made without a documented change-planning step.",
    desiredState: "Material AIMS changes follow a documented planning and impact-assessment process.",
    gapDescription: "No template or checklist exists for planning AIMS changes.",
    severity: "MEDIUM",
    maturityCurrent: 0,
    maturityTarget: 2,
    recommendation: "Add an AIMS change-planning checklist to the governance operating manual.",
    ownerRole: "Chief Risk Officer",
  },
  {
    requirementRef: "8.4",
    requirementTitle: "AI system impact assessment (operation)",
    currentState: "Impact assessments are not refreshed once an AI system is in production.",
    desiredState: "Impact assessments are refreshed at planned intervals or on significant change.",
    gapDescription: "No trigger exists to refresh an impact assessment after go-live.",
    severity: "MEDIUM",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Add an annual impact-assessment refresh trigger for High/Critical tier systems.",
    ownerRole: "Head of Compliance",
  },
  {
    requirementRef: "A.2.4",
    requirementTitle: "Review of the AI policy",
    currentState: "The AI policy has a nominal review cycle, but two supporting documents are overdue for review.",
    desiredState: "All AI policy documents are reviewed on or before their scheduled review date.",
    gapDescription: "Two documents (AIMS Manual, AI System Development Life Cycle Procedure) are past their next review date.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Clear the two overdue reviews and add a calendar reminder ahead of future due dates.",
    ownerRole: "Board Risk Committee",
  },
  {
    requirementRef: "A.9.3",
    requirementTitle: "Objectives for responsible use of AI system",
    currentState: "Responsible-use objectives exist informally within business unit practice.",
    desiredState: "Documented, measurable responsible-use objectives exist for each business unit deploying AI.",
    gapDescription: "Objectives are not written down or consistently communicated to business units.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Document responsible-use objectives per business unit and review annually.",
    ownerRole: "Business Unit Head",
  },
  {
    requirementRef: "A.4.6",
    requirementTitle: "Human resources",
    currentState: "Role-based AI training exists but has not reached the Board.",
    desiredState: "Documented competence, including Board-level AI awareness training, is evidenced for all relevant roles.",
    gapDescription: "No Board training programme has yet reached COMPLETED status.",
    severity: "LOW",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Schedule and deliver the Board-level AI governance and risk oversight training programme.",
    ownerRole: "Head of Human Resources",
  },
  {
    requirementRef: "A.3.3",
    requirementTitle: "Reporting of concerns",
    currentState: "Concerns can be raised through the general whistleblowing channel but no AI-specific route is signposted.",
    desiredState: "A signposted route exists specifically for reporting AI-related concerns.",
    gapDescription: "Staff awareness of an AI-specific reporting route is low per the latest training feedback.",
    severity: "LOW",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Signpost the AI-specific concern-reporting route in the AI acceptable-use training.",
    ownerRole: "Head of Compliance",
  },
  {
    requirementRef: "A.6.2.8",
    requirementTitle: "AI system recording of event logs",
    currentState: "Event logging is enabled for most production AI systems but retention periods are inconsistent.",
    desiredState: "A consistent, documented event-log retention standard applies across all production AI systems.",
    gapDescription: "Retention periods vary by system owner rather than following a single standard.",
    severity: "LOW",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Publish a single event-log retention standard and apply it at next system change.",
    ownerRole: "Head of AI Operations",
  },
];

const RBI_FREE_AI_FINDINGS: GapFindingSeed[] = [
  {
    requirementRef: "SUTRA-7",
    requirementTitle: "Safety, Resilience, and Sustainability",
    currentState: "Adversarial testing and business continuity coverage are both incomplete for AI systems.",
    desiredState: "Every critical AI system has adversarial testing and a tested continuity fallback.",
    gapDescription: "Neither the red-team programme nor the AI business continuity plan is operating yet.",
    severity: "CRITICAL",
    maturityCurrent: 1,
    maturityTarget: 4,
    recommendation: "Stand up the red-team programme and complete BCP testing for the three critical AI services.",
    ownerRole: "Chief Information Security Officer",
  },
  {
    requirementRef: "REC-20",
    requirementTitle: "Red Teaming",
    currentState: "No formal adversarial or prompt-injection testing programme exists.",
    desiredState: "Adversarial testing runs before deployment and on a defined cycle thereafter, with findings tracked.",
    gapDescription: "Only ad hoc penetration testing has occurred; no AI-specific red-team cycle is defined.",
    severity: "HIGH",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Commission a red-team programme covering all customer-facing GenAI surfaces.",
    ownerRole: "Chief Information Security Officer",
  },
  {
    requirementRef: "REC-21",
    requirementTitle: "Business Continuity Plan for AI Systems",
    currentState: "Fallback exists informally for some services but has not been exercised.",
    desiredState: "A documented and exercised fallback exists for every critical AI service.",
    gapDescription: "No AI-specific continuity test has been run in the last 12 months.",
    severity: "HIGH",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Exercise the fallback path for the three critical AI services and document the results.",
    ownerRole: "Head of Business Continuity",
  },
  {
    requirementRef: "REC-22",
    requirementTitle: "AI Incident Reporting and Sectoral Risk Intelligence Framework",
    currentState: "AI incidents are logged within the general operational risk process without an AI-specific taxonomy.",
    desiredState: "A dedicated AI incident taxonomy exists with defined escalation and regulatory-notification criteria.",
    gapDescription: "No AI-specific incident taxonomy or sectoral intelligence-sharing channel is in place.",
    severity: "HIGH",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Publish an AI incident taxonomy and escalation criteria aligned to the REC-22 recommendation.",
    ownerRole: "Head of Operational Risk",
  },
  {
    requirementRef: "REC-4",
    requirementTitle: "Indigenous Financial Sector Specific AI Models",
    currentState: "All GenAI capability depends on a single foreign general-purpose model provider.",
    desiredState: "Indigenous or India-specific model alternatives are evaluated for vernacular and data-residency-sensitive workloads.",
    gapDescription: "No evaluation of indigenous alternatives has been commissioned.",
    severity: "MEDIUM",
    maturityCurrent: 1,
    maturityTarget: 3,
    recommendation: "Commission an evaluation of indigenous financial-sector AI model alternatives.",
    ownerRole: "Chief Technology Officer",
  },
  {
    requirementRef: "SUTRA-6",
    requirementTitle: "Understandable by Design",
    currentState: "Explainability standard is drafted; adverse-action reason codes are inconsistently accurate.",
    desiredState: "Every adverse decision carries a reason code a customer and a supervisor can both follow.",
    gapDescription: "Reason-code accuracy testing on the underwriting engine flagged two inaccurate notices.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 4,
    recommendation: "Deploy automated reason-code accuracy regression testing to the model CI pipeline.",
    ownerRole: "Head of Model Risk",
  },
  {
    requirementRef: "REC-18",
    requirementTitle: "Consumer Protection",
    currentState: "AI-in-use disclosure and grievance handling exist but are not consistently applied to AI decisions.",
    desiredState: "Disclosure, human-review routing and grievance handling consistently cover every AI-assisted decision.",
    gapDescription: "Grievance handling does not yet flag when a complaint traces back to an AI-assisted decision.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Tag AI-assisted decisions in the grievance system so redress can trace back to the model.",
    ownerRole: "Head of Customer Experience",
  },
  {
    requirementRef: "REC-24",
    requirementTitle: "AI Audit Framework",
    currentState: "Internal audit has reviewed parts of the AI governance framework but not on a defined cycle.",
    desiredState: "A defined periodic internal and third-party audit cycle exists for the AI management system.",
    gapDescription: "No standing annual AI audit plan has been approved by the Audit Committee.",
    severity: "MEDIUM",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Approve a standing annual AI audit plan with the Board Audit Committee.",
    ownerRole: "Head of Internal Audit",
  },
  {
    requirementRef: "SUTRA-3",
    requirementTitle: "Innovation over Restraint",
    currentState: "Risk-tiered fast-tracking exists for Minimal/Low risk use cases but is not consistently applied.",
    desiredState: "Governance is consistently calibrated to risk tier across all business units.",
    gapDescription: "Two business units still route all AI use cases through the full High-tier process regardless of actual risk.",
    severity: "LOW",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Refresh business-unit training on the risk-tiering fast-track criteria.",
    ownerRole: "Chief Technology Officer",
  },
  {
    requirementRef: "REC-7",
    requirementTitle: "Enabling AI-Based Affirmative Action",
    currentState: "Thin-file credit scoring exists but the inclusion objective is not formally documented or monitored.",
    desiredState: "The financial-inclusion objective for AI-based scoring is documented and monitored for disparate impact.",
    gapDescription: "No disparate-impact monitoring is currently run against the inclusion objective.",
    severity: "LOW",
    maturityCurrent: 2,
    maturityTarget: 3,
    recommendation: "Document the inclusion objective and add disparate-impact monitoring to the fairness testing cycle.",
    ownerRole: "Head of Financial Inclusion",
  },
];

async function seedGapAssessments(organizationId: string) {
  const existing = await prisma.gapAssessment.count({ where: { organizationId } });
  if (existing > 0) return { assessmentsCreated: 0, findingsCreated: 0, skipped: true };

  const assessmentDefs: { name: string; framework: string; scope: string; assessorName: string; findings: GapFindingSeed[] }[] = [
    {
      name: "ISO/IEC 42001 Readiness Assessment",
      framework: "ISO42001",
      scope: "AI Management System — Clauses 4-10 and Annex A controls, full production AI inventory.",
      assessorName: "Independent Validation Unit",
      findings: ISO42001_FINDINGS,
    },
    {
      name: "RBI FREE-AI Alignment Review",
      framework: "RBI_FREE_AI",
      scope: "Regulated-entity-facing Sutras and Recommendations from the RBI FREE-AI committee report.",
      assessorName: "Head of Compliance",
      findings: RBI_FREE_AI_FINDINGS,
    },
  ];

  let assessmentsCreated = 0;
  let findingsCreated = 0;

  for (const def of assessmentDefs) {
    const assessment = await prisma.gapAssessment.create({
      data: {
        organizationId,
        name: def.name,
        framework: def.framework,
        scope: def.scope,
        assessorName: def.assessorName,
        status: "IN_PROGRESS" as GapAssessmentStatus,
        startedAt: daysAgo(60),
      },
    });
    assessmentsCreated += 1;

    await prisma.gapFinding.createMany({
      data: def.findings.map((f) => ({
        assessmentId: assessment.id,
        requirementRef: f.requirementRef,
        requirementTitle: f.requirementTitle,
        currentState: f.currentState,
        desiredState: f.desiredState,
        gapDescription: f.gapDescription,
        severity: f.severity,
        maturityCurrent: f.maturityCurrent,
        maturityTarget: f.maturityTarget,
        recommendation: f.recommendation,
        ownerRole: f.ownerRole,
        targetDate: daysFromNow(120),
      })),
    });
    findingsCreated += def.findings.length;

    // Recompute overallScore exactly as
    // src/app/api/gap-assessment/[id]/findings/route.ts does — never hand-set.
    const findings = await prisma.gapFinding.findMany({
      where: { assessmentId: assessment.id },
      select: { maturityCurrent: true, maturityTarget: true },
    });
    const overallScore = findings.length
      ? Math.round(
          findings.reduce((sum, f) => {
            const pct = f.maturityTarget === 0 ? 100 : (f.maturityCurrent / f.maturityTarget) * 100;
            return sum + Math.min(100, Math.max(0, pct));
          }, 0) / findings.length
        )
      : 0;
    await prisma.gapAssessment.update({ where: { id: assessment.id }, data: { overallScore } });
  }

  return { assessmentsCreated, findingsCreated, skipped: false };
}

// ============================================================================
// 8. Control Testing — 18 tests across ISO42001, DPDP, RBI_MRM.
//    Target: 12 EFFECTIVE, 3 PARTIALLY_EFFECTIVE, 3 INEFFECTIVE.
//    Every non-effective test has exceptions > 0.
// ============================================================================

interface ControlTestSeed {
  testRef: string;
  controlRef: string;
  controlTitle: string;
  framework: string;
  testObjective: string;
  testProcedure: string;
  method: TestMethod;
  sampleSize: number;
  samplesTested: number;
  exceptions: number;
  result: TestResult;
  testedBy: string;
  conclusion: string;
}

const CONTROL_TESTS: ControlTestSeed[] = [
  {
    testRef: "CT-001",
    controlRef: "A.2.2",
    controlTitle: "AI policy",
    framework: "ISO42001",
    testObjective: "Confirm the AI policy is board-approved, current and communicated.",
    testProcedure: "Inspected the Board approval minute, policy document and intranet publication record.",
    method: "INSPECTION",
    sampleSize: 1,
    samplesTested: 1,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Head of Internal Audit",
    conclusion: "Policy is board-approved, current and published. Control operating effectively.",
  },
  {
    testRef: "CT-002",
    controlRef: "A.3.2",
    controlTitle: "AI roles and responsibilities",
    framework: "ISO42001",
    testObjective: "Confirm AI roles and responsibilities are defined and communicated.",
    testProcedure: "Inquired with a sample of role holders and cross-checked against the RACI register.",
    method: "INQUIRY",
    sampleSize: 8,
    samplesTested: 8,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Internal Audit",
    conclusion: "All sampled role holders correctly identified their AI governance responsibilities.",
  },
  {
    testRef: "CT-003",
    controlRef: "A.6.2.4",
    controlTitle: "AI system verification and validation",
    framework: "ISO42001",
    testObjective: "Confirm independent validation occurred before production deployment.",
    testProcedure: "Reperformed the validation-completeness check for a sample of Tier 1/2 models.",
    method: "REPERFORMANCE",
    sampleSize: 15,
    samplesTested: 15,
    exceptions: 2,
    result: "PARTIALLY_EFFECTIVE",
    testedBy: "Model Risk Validation Team",
    conclusion: "Two models (Customer Churn, GenAI Service Assistant) were in production/UAT ahead of a completed validation cycle. Control partially effective.",
  },
  {
    testRef: "CT-004",
    controlRef: "A.6.2.6",
    controlTitle: "AI system operation and monitoring",
    framework: "ISO42001",
    testObjective: "Confirm production AI systems are monitored per the defined monitoring plan.",
    testProcedure: "Observed the AI operations monitoring dashboard and alert logs for a two-week window.",
    method: "OBSERVATION",
    sampleSize: 12,
    samplesTested: 12,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Head of AI Operations",
    conclusion: "Monitoring dashboards are current and alerts were actioned within SLA for all sampled systems.",
  },
  {
    testRef: "CT-005",
    controlRef: "A.7.5",
    controlTitle: "Data provenance",
    framework: "ISO42001",
    testObjective: "Confirm training data provenance is recorded for production AI systems.",
    testProcedure: "Inspected lineage records for a sample of training datasets feeding Tier 1 models.",
    method: "INSPECTION",
    sampleSize: 20,
    samplesTested: 20,
    exceptions: 4,
    result: "INEFFECTIVE",
    testedBy: "Chief Data Officer's team",
    conclusion: "Four of twenty datasets, spanning three retail lending models, lacked source-system lineage metadata. Control ineffective; raised as NCR-001.",
  },
  {
    testRef: "CT-006",
    controlRef: "A.8.4",
    controlTitle: "Communication of incidents",
    framework: "ISO42001",
    testObjective: "Confirm an AI incident communication plan exists and was executed within SLA on a recent incident.",
    testProcedure: "Inquired of Operational Risk and reviewed the two most recent AI-related incident tickets.",
    method: "INQUIRY",
    sampleSize: 10,
    samplesTested: 10,
    exceptions: 3,
    result: "INEFFECTIVE",
    testedBy: "Head of Operational Risk",
    conclusion: "No documented communication plan exists; three of the sampled incidents had no evidenced customer or regulator communication. Control ineffective; raised as NCR-002.",
  },
  {
    testRef: "CT-007",
    controlRef: "A.9.4",
    controlTitle: "Intended use of the AI system",
    framework: "ISO42001",
    testObjective: "Confirm AI systems are used only within their documented intended use.",
    testProcedure: "Reperformed a usage-log review against the documented intended-use statement for a model sample.",
    method: "REPERFORMANCE",
    sampleSize: 10,
    samplesTested: 10,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Model Risk Validation Team",
    conclusion: "No out-of-scope usage identified across the sample.",
  },
  {
    testRef: "CT-008",
    controlRef: "A.10.3",
    controlTitle: "Suppliers",
    framework: "ISO42001",
    testObjective: "Confirm AI vendor relationships have current, evidenced due-diligence records.",
    testProcedure: "Inspected the vendor due-diligence file for a sample of active AI vendor contracts.",
    method: "INSPECTION",
    sampleSize: 12,
    samplesTested: 12,
    exceptions: 1,
    result: "PARTIALLY_EFFECTIVE",
    testedBy: "Head of Vendor Management",
    conclusion: "One of twelve vendor files lacked retained due-diligence evidence for the AI-specific addendum. Control partially effective; raised as NCR-004.",
  },
  {
    testRef: "CT-009",
    controlRef: "DPDP-6.1",
    controlTitle: "Notice and consent capture for AI processing",
    framework: "DPDP",
    testObjective: "Confirm valid notice and consent is captured before personal data is processed by an AI system.",
    testProcedure: "Inspected consent capture logs for a sample of customer onboarding journeys using AI.",
    method: "INSPECTION",
    sampleSize: 25,
    samplesTested: 25,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Data Protection Officer",
    conclusion: "Valid, timestamped consent was captured for all sampled journeys.",
  },
  {
    testRef: "CT-010",
    controlRef: "DPDP-7.2",
    controlTitle: "Data principal rights fulfilment timeline",
    framework: "DPDP",
    testObjective: "Confirm data principal access/correction/erasure requests touching AI systems are fulfilled within the statutory window.",
    testProcedure: "Reperformed the SLA calculation for a sample of closed data principal requests.",
    method: "REPERFORMANCE",
    sampleSize: 15,
    samplesTested: 15,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Data Protection Officer",
    conclusion: "All sampled requests were fulfilled within the statutory timeline.",
  },
  {
    testRef: "CT-011",
    controlRef: "DPDP-8.1",
    controlTitle: "Breach notification procedure",
    framework: "DPDP",
    testObjective: "Confirm the breach notification procedure is documented and rehearsed.",
    testProcedure: "Inquired with the Data Protection Officer and reviewed the most recent tabletop exercise record.",
    method: "INQUIRY",
    sampleSize: 1,
    samplesTested: 1,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Data Protection Officer",
    conclusion: "Procedure is documented and was last rehearsed within the current year.",
  },
  {
    testRef: "CT-012",
    controlRef: "DPDP-6.1",
    controlTitle: "Consent withdrawal propagation to downstream models",
    framework: "DPDP",
    testObjective: "Confirm a withdrawn consent is propagated to every downstream model and dataset using that data.",
    testProcedure: "Observed the consent-withdrawal propagation job for a sample of recent withdrawals.",
    method: "OBSERVATION",
    sampleSize: 10,
    samplesTested: 10,
    exceptions: 2,
    result: "PARTIALLY_EFFECTIVE",
    testedBy: "Data Protection Officer",
    conclusion: "Two withdrawals were not propagated to an archived model snapshot. Control partially effective; raised as NCR-007.",
  },
  {
    testRef: "CT-013",
    controlRef: "DPDP-7.2",
    controlTitle: "Purpose limitation enforcement in AI data pipelines",
    framework: "DPDP",
    testObjective: "Confirm AI data pipelines process personal data only for the stated purpose.",
    testProcedure: "Inspected pipeline configuration and purpose tags for a sample of AI data flows.",
    method: "INSPECTION",
    sampleSize: 12,
    samplesTested: 12,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Data Protection Officer",
    conclusion: "Purpose tags matched the documented lawful basis for all sampled flows.",
  },
  {
    testRef: "CT-014",
    controlRef: "RBI-MRM-01",
    controlTitle: "Independent model validation prior to deployment",
    framework: "RBI_MRM",
    testObjective: "Confirm no model reaches production without independent validation.",
    testProcedure: "Reperformed the deployment-gate check against the validation register.",
    method: "REPERFORMANCE",
    sampleSize: 12,
    samplesTested: 12,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Independent Validation Unit",
    conclusion: "All production models had a completed validation record prior to deployment.",
  },
  {
    testRef: "CT-015",
    controlRef: "RBI-MRM-02",
    controlTitle: "Tier-based revalidation frequency adherence",
    framework: "RBI_MRM",
    testObjective: "Confirm revalidation occurs at the frequency mandated by model tier.",
    testProcedure: "Inspected the revalidation calendar against actual validation completion dates.",
    method: "INSPECTION",
    sampleSize: 12,
    samplesTested: 12,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Independent Validation Unit",
    conclusion: "Revalidation cadence matched the tier-based schedule for the sample tested.",
  },
  {
    testRef: "CT-016",
    controlRef: "RBI-MRM-03",
    controlTitle: "Model performance drift monitoring",
    framework: "RBI_MRM",
    testObjective: "Confirm drift monitoring is active and alerts are actioned within SLA.",
    testProcedure: "Observed drift-monitoring dashboards and alert-closure records over a one-month window.",
    method: "OBSERVATION",
    sampleSize: 10,
    samplesTested: 10,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Head of AI Operations",
    conclusion: "Drift alerts were actioned within the defined SLA for all sampled models.",
  },
  {
    testRef: "CT-017",
    controlRef: "RBI-MRM-04",
    controlTitle: "Human oversight override path testing",
    framework: "RBI_MRM",
    testObjective: "Confirm the human override path for consequential AI decisions is tested and functional.",
    testProcedure: "Reperformed an end-to-end override on a non-production replica of the underwriting engine.",
    method: "REPERFORMANCE",
    sampleSize: 8,
    samplesTested: 8,
    exceptions: 0,
    result: "EFFECTIVE",
    testedBy: "Head of Compliance",
    conclusion: "Override path functioned correctly and produced a complete audit trail.",
  },
  {
    testRef: "CT-018",
    controlRef: "RBI-MRM-05",
    controlTitle: "Adverse action reason code accuracy",
    framework: "RBI_MRM",
    testObjective: "Confirm adverse-action reason codes issued to declined applicants are accurate and traceable to model drivers.",
    testProcedure: "Inspected reason codes issued against the underlying model feature attributions for a sample of declines.",
    method: "INSPECTION",
    sampleSize: 10,
    samplesTested: 10,
    exceptions: 3,
    result: "INEFFECTIVE",
    testedBy: "Head of Model Risk",
    conclusion: "Three of ten reason codes did not match the top model drivers for the decline. Control ineffective; raised as NCR-005.",
  },
];

async function seedControlTesting(organizationId: string) {
  const existing = await prisma.controlTest.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.controlTest.createMany({
    data: CONTROL_TESTS.map((t) => ({
      organizationId,
      testRef: t.testRef,
      controlRef: t.controlRef,
      controlTitle: t.controlTitle,
      framework: t.framework,
      testObjective: t.testObjective,
      testProcedure: t.testProcedure,
      method: t.method,
      sampleSize: t.sampleSize,
      samplesTested: t.samplesTested,
      exceptions: t.exceptions,
      result: t.result,
      testedBy: t.testedBy,
      testedAt: daysAgo(15),
      evidence: `Test workpaper CT-${t.testRef.split("-")[1]} retained in the control testing evidence repository.`,
      conclusion: t.conclusion,
    })),
    skipDuplicates: true,
  });

  return { created: CONTROL_TESTS.length, skipped: false };
}

// ============================================================================
// 9. NCR & CAPA Register — 7 NonConformities (2 MAJOR open, 3 MINOR, 2
//    OBSERVATION; 3 CLOSED overall) and 11 CAPAs across them, 3 OVERDUE.
// ============================================================================

interface NcrSeed {
  ncrRef: string;
  title: string;
  description: string;
  type: NcrType;
  status: NcrStatus;
  clauseRef: string;
  source: string;
  raisedBy: string;
  rootCause: string;
  immediateCorrection: string;
  dueDate: Date;
  closedAt: Date | null;
  verifiedBy: string | null;
  capas: {
    capaRef: string;
    actionType: CapaActionType;
    description: string;
    ownerRole: string;
    status: CapaStatus;
    dueDate: Date;
    completedAt: Date | null;
    effectivenessCheck: string | null;
  }[];
}

const NCR_RECORDS: NcrSeed[] = [
  {
    ncrRef: "NCR-2026-001",
    title: "Data provenance records missing for AI training datasets",
    description: "Control testing (CT-005) found four of twenty sampled training datasets, feeding three retail lending models, without recorded source-system lineage metadata.",
    type: "MAJOR",
    status: "OPEN",
    clauseRef: "A.7.5",
    source: "Control Testing CT-005",
    raisedBy: "Head of Internal Audit",
    rootCause: "The data acquisition pipeline for three retail lending models does not capture source-system lineage metadata before ingestion into the feature store.",
    immediateCorrection: "Manual lineage reconstruction completed for the three affected datasets pending the permanent pipeline fix.",
    dueDate: daysFromNow(45),
    closedAt: null,
    verifiedBy: null,
    capas: [
      {
        capaRef: "CAPA-2026-001",
        actionType: "CORRECTIVE",
        description: "Implement automated lineage capture in the feature-store ingestion pipeline.",
        ownerRole: "Chief Data Officer",
        status: "IN_PROGRESS",
        dueDate: daysFromNow(45),
        completedAt: null,
        effectivenessCheck: null,
      },
      {
        capaRef: "CAPA-2026-002",
        actionType: "CORRECTIVE",
        description: "Complete lineage backfill for all Tier 1 training datasets.",
        ownerRole: "Chief Data Officer",
        status: "OVERDUE",
        dueDate: daysAgo(10),
        completedAt: null,
        effectivenessCheck: null,
      },
    ],
  },
  {
    ncrRef: "NCR-2026-002",
    title: "AI incident communication plan not executed within SLA",
    description: "Control testing (CT-006) found no documented AI incident communication plan and no evidenced customer/regulator communication for three of ten sampled incidents.",
    type: "MAJOR",
    status: "CAPA_ASSIGNED",
    clauseRef: "A.8.4",
    source: "Control Testing CT-006",
    raisedBy: "Head of Operational Risk",
    rootCause: "No standard incident communication runbook exists; communication decisions are made case-by-case by the responding team.",
    immediateCorrection: "Interim manual escalation checklist issued to the incident response team pending the permanent runbook.",
    dueDate: daysFromNow(30),
    closedAt: null,
    verifiedBy: null,
    capas: [
      {
        capaRef: "CAPA-2026-003",
        actionType: "CORRECTIVE",
        description: "Publish a revised AI incident communication runbook with defined SLA timers.",
        ownerRole: "Head of Operational Risk",
        status: "OPEN",
        dueDate: daysFromNow(30),
        completedAt: null,
        effectivenessCheck: null,
      },
      {
        capaRef: "CAPA-2026-004",
        actionType: "PREVENTIVE",
        description: "Conduct an incident communication drill with Operational Risk and Compliance.",
        ownerRole: "Head of Operational Risk",
        status: "OVERDUE",
        dueDate: daysAgo(5),
        completedAt: null,
        effectivenessCheck: null,
      },
    ],
  },
  {
    ncrRef: "NCR-2026-003",
    title: "Q1 Board KRI pack evidence not retained",
    description: "Internal audit found the Q1 integrated technology/cyber/AI/data KRI pack presented to the Board Risk Committee was not retained in the evidence repository.",
    type: "MINOR",
    status: "CLOSED",
    clauseRef: "ISO42001-9.3",
    source: "Internal Audit",
    raisedBy: "Head of Internal Audit",
    rootCause: "The reporting SOP did not explicitly require the final Board pack to be filed after presentation.",
    immediateCorrection: "The Q1 pack was retrieved from the Company Secretary's records and filed retrospectively.",
    dueDate: daysAgo(60),
    closedAt: daysAgo(20),
    verifiedBy: "Head of Compliance",
    capas: [
      {
        capaRef: "CAPA-2026-005",
        actionType: "CORRECTIVE",
        description: "Add the Q1 Board KRI pack evidence to the compliance evidence repository.",
        ownerRole: "Head of Compliance",
        status: "VERIFIED",
        dueDate: daysAgo(70),
        completedAt: daysAgo(65),
        effectivenessCheck: "Confirmed present in the evidence repository at the next quarterly audit sample.",
      },
      {
        capaRef: "CAPA-2026-006",
        actionType: "PREVENTIVE",
        description: "Update the AI Governance Committee Reporting SOP checklist to require pack filing after every Board presentation.",
        ownerRole: "Head of Compliance",
        status: "COMPLETED",
        dueDate: daysAgo(50),
        completedAt: daysAgo(48),
        effectivenessCheck: null,
      },
    ],
  },
  {
    ncrRef: "NCR-2026-004",
    title: "AI vendor due-diligence checklist not evidenced for one procurement",
    description: "Control testing (CT-008) found one of twelve sampled AI vendor files without a retained due-diligence checklist for the AI-specific addendum.",
    type: "MINOR",
    status: "CLOSED",
    clauseRef: "A.10.3",
    source: "Control Testing CT-008",
    raisedBy: "Head of Vendor Management",
    rootCause: "The AI-specific addendum to the vendor due-diligence checklist was introduced after this contract's onboarding and was not applied retrospectively.",
    immediateCorrection: "The affected vendor was re-assessed against the current AI addendum.",
    dueDate: daysAgo(40),
    closedAt: daysAgo(12),
    verifiedBy: "Head of Vendor Management",
    capas: [
      {
        capaRef: "CAPA-2026-007",
        actionType: "CORRECTIVE",
        description: "Retrofit vendor due-diligence evidence for the affected procurement.",
        ownerRole: "Head of Vendor Management",
        status: "VERIFIED",
        dueDate: daysAgo(45),
        completedAt: daysAgo(42),
        effectivenessCheck: "Evidence confirmed present and complete on re-inspection.",
      },
    ],
  },
  {
    ncrRef: "NCR-2026-005",
    title: "Adverse action reason codes inaccurate for declined credit applications",
    description: "Control testing (CT-018) found three of ten sampled adverse-action reason codes did not match the underlying model's top drivers for the decline.",
    type: "MINOR",
    status: "PENDING_VERIFICATION",
    clauseRef: "A.8.2",
    source: "Control Testing CT-018",
    raisedBy: "Head of Model Risk",
    rootCause: "The reason-code mapping layer was not updated after the last Loan Underwriting Engine feature refresh.",
    immediateCorrection: "Corrected reason-code notices re-issued to the two affected applicants.",
    dueDate: daysFromNow(15),
    closedAt: null,
    verifiedBy: null,
    capas: [
      {
        capaRef: "CAPA-2026-008",
        actionType: "CORRECTIVE",
        description: "Re-issue corrected adverse-action notices to the two affected applicants.",
        ownerRole: "Head of Model Risk",
        status: "COMPLETED",
        dueDate: daysAgo(5),
        completedAt: daysAgo(3),
        effectivenessCheck: null,
      },
      {
        capaRef: "CAPA-2026-009",
        actionType: "PREVENTIVE",
        description: "Deploy a reason-code accuracy regression test to the model CI pipeline.",
        ownerRole: "Head of Model Risk",
        status: "OVERDUE",
        dueDate: daysAgo(8),
        completedAt: null,
        effectivenessCheck: null,
      },
    ],
  },
  {
    ncrRef: "NCR-2026-006",
    title: "Training completion records stored outside the central LMS",
    description: "Internal audit found one regional office maintained AI governance training completion records in a local spreadsheet rather than the central LMS.",
    type: "OBSERVATION",
    status: "CLOSED",
    clauseRef: "7.2",
    source: "Internal Audit",
    raisedBy: "Head of Human Resources",
    rootCause: "The regional office onboarded a new facilitator who was not briefed on the central LMS recording requirement.",
    immediateCorrection: "Historical records for the affected office were migrated into the central LMS.",
    dueDate: daysAgo(30),
    closedAt: daysAgo(8),
    verifiedBy: "Head of Human Resources",
    capas: [
      {
        capaRef: "CAPA-2026-010",
        actionType: "CORRECTIVE",
        description: "Migrate the regional office's training completion records into the central LMS.",
        ownerRole: "Head of Human Resources",
        status: "COMPLETED",
        dueDate: daysAgo(35),
        completedAt: daysAgo(30),
        effectivenessCheck: null,
      },
    ],
  },
  {
    ncrRef: "NCR-2026-007",
    title: "Consent withdrawal not propagated to an archived model snapshot",
    description: "Control testing (CT-012) found two of ten sampled consent withdrawals were not propagated to an archived model snapshot.",
    type: "OBSERVATION",
    status: "UNDER_INVESTIGATION",
    clauseRef: "DPDP-6.1",
    source: "Control Testing CT-012",
    raisedBy: "Data Protection Officer",
    rootCause: "The consent-withdrawal propagation job does not currently scan archived model snapshots, only active production models.",
    immediateCorrection: "The two affected records were manually purged from the archived snapshot.",
    dueDate: daysFromNow(30),
    closedAt: null,
    verifiedBy: null,
    capas: [
      {
        capaRef: "CAPA-2026-011",
        actionType: "CORRECTIVE",
        description: "Extend the consent-withdrawal propagation job to cover archived model snapshots.",
        ownerRole: "Data Protection Officer",
        status: "IN_PROGRESS",
        dueDate: daysFromNow(30),
        completedAt: null,
        effectivenessCheck: null,
      },
    ],
  },
];

async function seedNcrCapa(organizationId: string) {
  const existing = await prisma.nonConformity.count({ where: { organizationId } });
  if (existing > 0) return { ncrsCreated: 0, capasCreated: 0, skipped: true };

  let ncrsCreated = 0;
  let capasCreated = 0;

  for (const n of NCR_RECORDS) {
    const ncr = await prisma.nonConformity.create({
      data: {
        organizationId,
        ncrRef: n.ncrRef,
        title: n.title,
        description: n.description,
        type: n.type,
        status: n.status,
        clauseRef: n.clauseRef,
        source: n.source,
        raisedBy: n.raisedBy,
        raisedAt: daysAgo(75),
        rootCause: n.rootCause,
        immediateCorrection: n.immediateCorrection,
        dueDate: n.dueDate,
        closedAt: n.closedAt,
        verifiedBy: n.verifiedBy,
      },
    });
    ncrsCreated += 1;

    await prisma.capa.createMany({
      data: n.capas.map((c) => ({
        ncrId: ncr.id,
        capaRef: c.capaRef,
        actionType: c.actionType,
        description: c.description,
        ownerRole: c.ownerRole,
        dueDate: c.dueDate,
        status: c.status,
        completedAt: c.completedAt,
        effectivenessCheck: c.effectivenessCheck,
        effectivenessVerifiedAt: c.status === "VERIFIED" ? daysAgo(18) : null,
      })),
    });
    capasCreated += n.capas.length;
  }

  return { ncrsCreated, capasCreated, skipped: false };
}

// ============================================================================
// 10. Prioritized Remediation Roadmap — 21 items across all four horizons.
//     Target: 5 P1 items not yet COMPLETED, 2 BLOCKED, average progressPct
//     exactly 43.
// ============================================================================

interface RemediationSeed {
  itemRef: string;
  title: string;
  description: string;
  priority: RemediationPriority;
  status: RemediationStatus;
  horizon: RemediationHorizon;
  workstream: string;
  framework: string;
  sourceRef: string | null;
  ownerRole: string;
  effortDays: number;
  progressPct: number;
}

const REMEDIATION_ITEMS: RemediationSeed[] = [
  { itemRef: "REM-001", title: "Stand up AI red-team testing programme for customer-facing GenAI", description: "Commission and operationalise adversarial/prompt-injection testing ahead of GenAI Service Assistant go-live.", priority: "P1", status: "COMPLETED", horizon: "QUICK_WIN", workstream: "Cyber", framework: "RBI_FREE_AI", sourceRef: "REC-20", ownerRole: "Chief Information Security Officer", effortDays: 15, progressPct: 100 },
  { itemRef: "REM-002", title: "Build and test business continuity fallback for critical AI services", description: "Design and exercise a fallback path for the three critical AI services, including external model provider failure.", priority: "P1", status: "IN_PROGRESS", horizon: "SHORT_TERM", workstream: "Technology", framework: "RBI_FREE_AI", sourceRef: "REC-21", ownerRole: "Head of Business Continuity", effortDays: 30, progressPct: 65 },
  { itemRef: "REM-003", title: "Formalise AI incident taxonomy and regulatory notification criteria", description: "Publish a dedicated AI incident taxonomy with escalation thresholds and regulatory notification triggers.", priority: "P1", status: "IN_PROGRESS", horizon: "SHORT_TERM", workstream: "Operational Risk", framework: "RBI_FREE_AI", sourceRef: "REC-22", ownerRole: "Head of Operational Risk", effortDays: 20, progressPct: 50 },
  { itemRef: "REM-004", title: "Automate data lineage capture across the retail lending feature store", description: "Instrument the ingestion pipeline to capture source-system lineage automatically for all Tier 1 training datasets.", priority: "P1", status: "BLOCKED", horizon: "MEDIUM_TERM", workstream: "Data", framework: "ISO42001", sourceRef: "NCR-2026-001", ownerRole: "Chief Data Officer", effortDays: 40, progressPct: 35 },
  { itemRef: "REM-005", title: "Deliver Board-level AI governance and risk oversight training", description: "Schedule and deliver the Board AI awareness training programme currently outstanding.", priority: "P1", status: "IN_PROGRESS", horizon: "MEDIUM_TERM", workstream: "Training", framework: "ISO42001", sourceRef: "A.4.6", ownerRole: "Head of Human Resources", effortDays: 10, progressPct: 60 },
  { itemRef: "REM-006", title: "Deploy reason-code accuracy regression testing to the model CI pipeline", description: "Add automated regression tests that verify adverse-action reason codes against model feature attributions before release.", priority: "P1", status: "NOT_STARTED", horizon: "SHORT_TERM", workstream: "Model Risk", framework: "RBI_MRM", sourceRef: "NCR-2026-005", ownerRole: "Head of Model Risk", effortDays: 15, progressPct: 0 },
  { itemRef: "REM-007", title: "Publish revised AI incident communication runbook", description: "Publish the runbook with defined SLA timers for customer and regulator communication.", priority: "P2", status: "COMPLETED", horizon: "QUICK_WIN", workstream: "Operational Risk", framework: "ISO42001", sourceRef: "NCR-2026-002", ownerRole: "Head of Operational Risk", effortDays: 8, progressPct: 100 },
  { itemRef: "REM-008", title: "Close vendor due-diligence evidence gap for AI procurement", description: "Retrofit and evidence the AI-specific due-diligence addendum for the affected vendor contract.", priority: "P2", status: "COMPLETED", horizon: "QUICK_WIN", workstream: "Vendor Management", framework: "ISO42001", sourceRef: "NCR-2026-004", ownerRole: "Head of Vendor Management", effortDays: 5, progressPct: 100 },
  { itemRef: "REM-009", title: "Complete societal impact assessment methodology", description: "Define and pilot a societal-level AI impact assessment methodology for Critical-tier systems.", priority: "P2", status: "IN_PROGRESS", horizon: "SHORT_TERM", workstream: "Compliance", framework: "ISO42001", sourceRef: "A.5.5", ownerRole: "Head of Compliance", effortDays: 25, progressPct: 75 },
  { itemRef: "REM-010", title: "Extend consent-withdrawal propagation to archived model snapshots", description: "Update the propagation job so withdrawn consent reaches archived, not only active, model snapshots.", priority: "P2", status: "IN_PROGRESS", horizon: "SHORT_TERM", workstream: "Data Privacy", framework: "DPDP", sourceRef: "NCR-2026-007", ownerRole: "Data Protection Officer", effortDays: 12, progressPct: 55 },
  { itemRef: "REM-011", title: "Evaluate indigenous AI model alternatives", description: "Evaluate India-specific model alternatives to reduce concentration on a single foreign general-purpose provider.", priority: "P2", status: "BLOCKED", horizon: "MEDIUM_TERM", workstream: "Technology", framework: "RBI_FREE_AI", sourceRef: "REC-4", ownerRole: "Chief Technology Officer", effortDays: 35, progressPct: 25 },
  { itemRef: "REM-012", title: "Integrate AI-linked DPI flows into the impact assessment process", description: "Bring UPI/Account Aggregator-linked AI integrations formally within the impact assessment and consent architecture.", priority: "P2", status: "NOT_STARTED", horizon: "LONG_TERM", workstream: "Digital Banking", framework: "RBI_FREE_AI", sourceRef: "REC-5", ownerRole: "Head of Digital Banking", effortDays: 30, progressPct: 0 },
  { itemRef: "REM-013", title: "Migrate regional training records into the central LMS", description: "Complete migration of the regional office's locally-held training completion records.", priority: "P3", status: "COMPLETED", horizon: "SHORT_TERM", workstream: "Training", framework: "ISO42001", sourceRef: "NCR-2026-006", ownerRole: "Head of Human Resources", effortDays: 4, progressPct: 100 },
  { itemRef: "REM-014", title: "Formalise AI product approval agenda item", description: "Add AI risk as an explicit standing agenda item in the product approval forum.", priority: "P3", status: "IN_PROGRESS", horizon: "MEDIUM_TERM", workstream: "Product Governance", framework: "RBI_FREE_AI", sourceRef: "REC-17", ownerRole: "Head of Product Governance", effortDays: 10, progressPct: 45 },
  { itemRef: "REM-015", title: "Publish AI toolkit alignment assessment", description: "Assess internal assessment templates against the sector AI toolkit once published by the regulator.", priority: "P3", status: "DEFERRED", horizon: "MEDIUM_TERM", workstream: "Model Risk", framework: "RBI_FREE_AI", sourceRef: "REC-26", ownerRole: "Head of Model Risk", effortDays: 15, progressPct: 15 },
  { itemRef: "REM-016", title: "Establish AI liability allocation clauses in vendor contracts", description: "Standardise liability allocation language for AI-related harm across the vendor contract template library.", priority: "P3", status: "NOT_STARTED", horizon: "LONG_TERM", workstream: "Legal", framework: "RBI_FREE_AI", sourceRef: "REC-8", ownerRole: "General Counsel", effortDays: 20, progressPct: 0 },
  { itemRef: "REM-017", title: "Build sector risk-intelligence sharing channel participation", description: "Establish the entity's participation channel into sector-wide AI risk intelligence sharing.", priority: "P3", status: "IN_PROGRESS", horizon: "LONG_TERM", workstream: "Regulatory Affairs", framework: "RBI_FREE_AI", sourceRef: "REC-12", ownerRole: "Head of Regulatory Affairs", effortDays: 18, progressPct: 30 },
  { itemRef: "REM-018", title: "Track incentive and funding schemes for responsible AI adoption", description: "Monitor and assess eligibility for emerging government/regulator incentive schemes.", priority: "P4", status: "NOT_STARTED", horizon: "MEDIUM_TERM", workstream: "Finance", framework: "RBI_FREE_AI", sourceRef: "REC-3", ownerRole: "Chief Financial Officer", effortDays: 10, progressPct: 0 },
  { itemRef: "REM-019", title: "Pilot AI-based financial inclusion scoring for thin-file segments", description: "Pilot and monitor an AI-based scoring approach for underserved, thin-file customer segments.", priority: "P4", status: "NOT_STARTED", horizon: "LONG_TERM", workstream: "Financial Inclusion", framework: "RBI_FREE_AI", sourceRef: "REC-7", ownerRole: "Head of Financial Inclusion", effortDays: 25, progressPct: 0 },
  { itemRef: "REM-020", title: "Contribute AI readiness input to sector capacity-building forums", description: "Provide input to industry association / SRO forums on AI capacity-building best practice.", priority: "P4", status: "DEFERRED", horizon: "LONG_TERM", workstream: "Regulatory Affairs", framework: "RBI_FREE_AI", sourceRef: "REC-12", ownerRole: "Head of Regulatory Affairs", effortDays: 8, progressPct: 10 },
  { itemRef: "REM-021", title: "Formalise recognition and reward scheme for governed AI delivery", description: "Introduce a performance-measure component that rewards governed AI delivery, not delivery speed alone.", priority: "P4", status: "IN_PROGRESS", horizon: "LONG_TERM", workstream: "Human Resources", framework: "RBI_FREE_AI", sourceRef: "REC-13", ownerRole: "Chief Human Resources Officer", effortDays: 12, progressPct: 38 },
];

async function seedRemediation(organizationId: string) {
  const existing = await prisma.remediationItem.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.remediationItem.createMany({
    data: REMEDIATION_ITEMS.map((r) => ({
      organizationId,
      itemRef: r.itemRef,
      title: r.title,
      description: r.description,
      priority: r.priority,
      status: r.status,
      horizon: r.horizon,
      workstream: r.workstream,
      framework: r.framework,
      sourceRef: r.sourceRef,
      ownerRole: r.ownerRole,
      effortDays: r.effortDays,
      progressPct: r.progressPct,
      startDate: daysAgo(45),
      targetDate: daysFromNow(90),
      completedAt: r.status === "COMPLETED" ? daysAgo(5) : null,
      dependencies: [],
    })),
    skipDuplicates: true,
  });

  return { created: REMEDIATION_ITEMS.length, skipped: false };
}

// ============================================================================
// 11. Training & Enablement — 9 programmes, 5 COMPLETED. BOARD has no
//     COMPLETED programme, so the governance rollup's Board-training gap fires.
// ============================================================================

interface TrainingSeed {
  code: string;
  title: string;
  description: string;
  audience: AudienceGroup;
  status: TrainingStatus;
  deliveryMode: string;
  durationHours: number;
  targetAttendees: number;
  actualAttendees: number;
  facilitator: string;
  frameworkRefs: string[];
}

const TRAINING_PROGRAMS: TrainingSeed[] = [
  {
    code: "TRN-001",
    title: "AI Governance & Risk Oversight for the Board",
    description: "Board-level briefing on AI risk appetite, governance structure and the Board's oversight obligations under ISO/IEC 42001 and RBI FREE-AI.",
    audience: "BOARD",
    status: "SCHEDULED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: 2,
    targetAttendees: 11,
    actualAttendees: 0,
    facilitator: "External AI Governance Advisor",
    frameworkRefs: ["ISO42001-5.1", "REC-14"],
  },
  {
    code: "TRN-002",
    title: "AI Risk Leadership Briefing for the Executive Committee",
    description: "Executive briefing on the AI risk profile, key blockers and the remediation roadmap ahead of the Board cycle.",
    audience: "EXECUTIVE",
    status: "COMPLETED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: 1.5,
    targetAttendees: 14,
    actualAttendees: 13,
    facilitator: "Chief Risk Officer",
    frameworkRefs: ["ISO42001-5.1"],
  },
  {
    code: "TRN-003",
    title: "Model Risk Management Fundamentals",
    description: "Core model risk management training covering validation, tiering and RBI regulatory expectations for Risk & Compliance staff.",
    audience: "RISK_COMPLIANCE",
    status: "COMPLETED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: 4,
    targetAttendees: 40,
    actualAttendees: 37,
    facilitator: "Head of Model Risk",
    frameworkRefs: ["A.6.2.4", "REC-24"],
  },
  {
    code: "TRN-004",
    title: "DPDP Act Compliance for AI Systems",
    description: "Practical training on consent capture, purpose limitation and data principal rights as applied to AI-driven processing.",
    audience: "RISK_COMPLIANCE",
    status: "IN_PROGRESS",
    deliveryMode: "E_LEARNING",
    durationHours: 2,
    targetAttendees: 40,
    actualAttendees: 22,
    facilitator: "Data Protection Officer",
    frameworkRefs: ["DPDP-6.1", "DPDP-7.2"],
  },
  {
    code: "TRN-005",
    title: "Responsible AI Engineering Practices",
    description: "Engineering-focused training on secure model development, documentation requirements and the AI SDLC control gates.",
    audience: "TECHNOLOGY",
    status: "COMPLETED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: 6,
    targetAttendees: 60,
    actualAttendees: 55,
    facilitator: "Head of AI Engineering",
    frameworkRefs: ["A.6.1.3", "A.6.2.3"],
  },
  {
    code: "TRN-006",
    title: "Bias Testing & Fairness Evaluation",
    description: "Applied training for data science teams on bias, fairness and adversarial robustness testing methods.",
    audience: "DATA_SCIENCE",
    status: "COMPLETED",
    deliveryMode: "WORKSHOP",
    durationHours: 5,
    targetAttendees: 25,
    actualAttendees: 24,
    facilitator: "Head of Model Validation",
    frameworkRefs: ["SUTRA-4", "REC-20"],
  },
  {
    code: "TRN-007",
    title: "AI-Enabled Product Approval Awareness",
    description: "Training for business unit product teams on routing AI-enabled products through the standard product approval forum.",
    audience: "BUSINESS_UNIT",
    status: "PLANNED",
    deliveryMode: "INSTRUCTOR_LED",
    durationHours: 2,
    targetAttendees: 35,
    actualAttendees: 0,
    facilitator: "Head of Product Governance",
    frameworkRefs: ["REC-17"],
  },
  {
    code: "TRN-008",
    title: "AI Acceptable Use & Shadow AI Awareness",
    description: "All-staff awareness training on approved AI tools, the intake process, and the risks of unregistered ('shadow') AI usage.",
    audience: "ALL_STAFF",
    status: "COMPLETED",
    deliveryMode: "E_LEARNING",
    durationHours: 1,
    targetAttendees: 2400,
    actualAttendees: 2180,
    facilitator: "Head of Compliance",
    frameworkRefs: ["AI-KRI-04"],
  },
  {
    code: "TRN-009",
    title: "Recognising and Reporting AI Incidents",
    description: "All-staff training on identifying and escalating AI incidents through the AI-specific reporting route.",
    audience: "ALL_STAFF",
    status: "SCHEDULED",
    deliveryMode: "E_LEARNING",
    durationHours: 0.5,
    targetAttendees: 2400,
    actualAttendees: 0,
    facilitator: "Head of Operational Risk",
    frameworkRefs: ["REC-22", "A.3.3"],
  },
];

async function seedTraining(organizationId: string) {
  const existing = await prisma.trainingProgram.count({ where: { organizationId } });
  if (existing > 0) return { created: 0, skipped: true };

  await prisma.trainingProgram.createMany({
    data: TRAINING_PROGRAMS.map((t) => ({
      organizationId,
      code: t.code,
      title: t.title,
      description: t.description,
      audience: t.audience,
      status: t.status,
      deliveryMode: t.deliveryMode,
      durationHours: t.durationHours,
      scheduledDate: t.status === "COMPLETED" ? daysAgo(40) : daysFromNow(20),
      completedDate: t.status === "COMPLETED" ? daysAgo(38) : null,
      targetAttendees: t.targetAttendees,
      actualAttendees: t.actualAttendees,
      facilitator: t.facilitator,
      frameworkRefs: t.frameworkRefs,
    })),
    skipDuplicates: true,
  });

  return { created: TRAINING_PROGRAMS.length, skipped: false };
}

export const POST = withAuth(async (_req: NextRequest, { user }) => {
  try {
    // Step 1 — find-or-create the demo org and ensure the caller is its OWNER.
    let demoOrg = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
    if (!demoOrg) {
      demoOrg = await prisma.organization.create({
        data: {
          name: DEMO_ORG_NAME,
          slug: DEMO_ORG_SLUG,
          plan: "PROFESSIONAL",
          maxUsers: 25,
          maxModels: 100,
          planExpiresAt: daysFromNow(365),
        },
      });
    }

    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: demoOrg.id, userId: user.userId } },
      update: { role: "OWNER", isActive: true },
      create: { organizationId: demoOrg.id, userId: user.userId, role: "OWNER" },
    });

    const orgId = demoOrg.id;

    // Bulk module seeding runs sequentially (not inside one giant transaction)
    // so a large KRI/finding insert never trips Prisma's interactive
    // transaction timeout. Each module is independently idempotent — see the
    // per-module count-and-skip check at the top of each seed function.
    const policies = await seedPolicies(orgId);
    const aims = await seedAims(orgId);
    const soa = await seedSoa(orgId);
    const freeAi = await seedFreeAi(orgId);
    const kri = await seedKri(orgId);
    const modelRisk = await seedModelRisk(orgId);
    const gapAssessment = await seedGapAssessments(orgId);
    const controlTesting = await seedControlTesting(orgId);
    const ncrCapa = await seedNcrCapa(orgId);
    const remediation = await seedRemediation(orgId);
    const training = await seedTraining(orgId);

    const token = await signJwt({
      userId: user.userId,
      email: user.email,
      name: user.name,
      organizationId: orgId,
      orgRole: "OWNER",
      plan: "PROFESSIONAL",
    });

    return ok({
      token,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: "ADMIN",
        organizationId: orgId,
        orgRole: "OWNER",
        plan: "PROFESSIONAL",
        organization: { id: demoOrg.id, name: demoOrg.name, slug: demoOrg.slug, plan: demoOrg.plan },
      },
      organizationId: orgId,
      organizationName: demoOrg.name,
      counts: {
        policies,
        aims,
        soa,
        freeAi,
        kri,
        modelRisk,
        gapAssessment,
        controlTesting,
        ncrCapa,
        remediation,
        training,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
