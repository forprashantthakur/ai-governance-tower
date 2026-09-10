import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Rolls the enterprise governance modules up into one readiness view — the
 * summary a Board Risk Committee asks for: how far along is each workstream,
 * and what is outstanding.
 *
 * Every module is queried independently and defensively. A tenant whose
 * database predates these tables, or who has simply not started a workstream,
 * gets a zeroed row rather than a failed dashboard.
 */

export interface WorkstreamReadiness {
  key: string;
  label: string;
  href: string;
  /** 0–100 completion of this workstream. */
  score: number;
  /** Items counted toward the score. */
  total: number;
  /** Items considered done. */
  complete: number;
  /** Short line describing what is outstanding. */
  detail: string;
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    // Table not yet created by `prisma db push`, or transient read failure.
    return fallback;
  }
}

function pct(complete: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((complete / total) * 100);
}

export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const now = new Date();

    const [
      policies,
      aims,
      soa,
      freeAi,
      modelRisk,
      gapFindings,
      controlTests,
      ncrs,
      remediation,
      kriLatest,
      training,
    ] = await Promise.all([
      safe(
        () =>
          prisma.policyDocument.findMany({
            where: { organizationId },
            select: { status: true, nextReviewDate: true },
          }),
        [] as { status: string; nextReviewDate: Date | null }[]
      ),
      safe(
        () =>
          prisma.aimsClause.findMany({
            where: { organizationId },
            select: { status: true },
          }),
        [] as { status: string }[]
      ),
      safe(
        () =>
          prisma.soaControl.findMany({
            where: { organizationId },
            select: { decision: true, implStatus: true, justification: true },
          }),
        [] as { decision: string; implStatus: string; justification: string | null }[]
      ),
      safe(
        () =>
          prisma.freeAiItem.findMany({
            where: { organizationId },
            select: { status: true },
          }),
        [] as { status: string }[]
      ),
      safe(
        () =>
          prisma.modelRiskRecord.findMany({
            where: { organizationId },
            select: { validationOutcome: true, nextValidationDue: true, tier: true },
          }),
        [] as { validationOutcome: string; nextValidationDue: Date | null; tier: string }[]
      ),
      safe(
        () =>
          prisma.gapFinding.findMany({
            where: { assessment: { organizationId } },
            select: { severity: true, maturityCurrent: true, maturityTarget: true },
          }),
        [] as { severity: string; maturityCurrent: number; maturityTarget: number }[]
      ),
      safe(
        () =>
          prisma.controlTest.findMany({
            where: { organizationId },
            select: { result: true },
          }),
        [] as { result: string }[]
      ),
      safe(
        () =>
          prisma.nonConformity.findMany({
            where: { organizationId },
            select: { status: true, type: true },
          }),
        [] as { status: string; type: string }[]
      ),
      safe(
        () =>
          prisma.remediationItem.findMany({
            where: { organizationId },
            select: { status: true, priority: true, progressPct: true },
          }),
        [] as { status: string; priority: string; progressPct: number }[]
      ),
      safe(
        () =>
          prisma.kriDefinition.findMany({
            where: { organizationId, isActive: true },
            select: {
              domain: true,
              readings: {
                orderBy: { periodLabel: "desc" },
                take: 1,
                select: { status: true, trend: true },
              },
            },
          }),
        [] as { domain: string; readings: { status: string; trend: string }[] }[]
      ),
      safe(
        () =>
          prisma.trainingProgram.findMany({
            where: { organizationId },
            select: { status: true, audience: true },
          }),
        [] as { status: string; audience: string }[]
      ),
    ]);

    // ── Policy framework ─────────────────────────────────────────────────────
    const policyLive = policies.filter(
      (p) => p.status === "PUBLISHED" || p.status === "APPROVED"
    ).length;
    const policyOverdueReview = policies.filter(
      (p) => p.nextReviewDate !== null && p.nextReviewDate < now
    ).length;

    // ── AIMS ─────────────────────────────────────────────────────────────────
    const aimsDone = aims.filter(
      (c) => c.status === "IMPLEMENTED" || c.status === "VERIFIED"
    ).length;

    // ── Statement of Applicability ───────────────────────────────────────────
    const soaApplicable = soa.filter((c) => c.decision !== "NOT_APPLICABLE");
    const soaImplemented = soaApplicable.filter(
      (c) => c.implStatus === "IMPLEMENTED"
    ).length;
    const soaUnjustified = soa.filter(
      (c) =>
        c.decision === "NOT_APPLICABLE" &&
        (c.justification === null || c.justification.trim() === "")
    ).length;

    // ── RBI FREE-AI ──────────────────────────────────────────────────────────
    const freeAiPass = freeAi.filter((i) => i.status === "PASS").length;

    // ── Model risk management ────────────────────────────────────────────────
    const mrmValidated = modelRisk.filter(
      (m) => m.validationOutcome === "PASS" || m.validationOutcome === "PASS_WITH_CONDITIONS"
    ).length;
    const mrmOverdue = modelRisk.filter(
      (m) => m.nextValidationDue !== null && m.nextValidationDue < now
    ).length;

    // ── Gap assessment (maturity closure) ────────────────────────────────────
    const gapClosed = gapFindings.filter(
      (f) => f.maturityCurrent >= f.maturityTarget
    ).length;
    const gapCritical = gapFindings.filter(
      (f) => f.severity === "CRITICAL" && f.maturityCurrent < f.maturityTarget
    ).length;

    // ── Control testing ──────────────────────────────────────────────────────
    const testsRun = controlTests.filter((t) => t.result !== "NOT_TESTED");
    const testsEffective = controlTests.filter((t) => t.result === "EFFECTIVE").length;
    const testsIneffective = controlTests.filter((t) => t.result === "INEFFECTIVE").length;

    // ── NCR / CAPA ───────────────────────────────────────────────────────────
    const ncrClosed = ncrs.filter((n) => n.status === "CLOSED").length;
    const ncrMajorOpen = ncrs.filter(
      (n) => n.type === "MAJOR" && n.status !== "CLOSED"
    ).length;

    // ── Remediation ──────────────────────────────────────────────────────────
    const remediationDone = remediation.filter((r) => r.status === "COMPLETED").length;
    const remediationP1Open = remediation.filter(
      (r) => r.priority === "P1" && r.status !== "COMPLETED"
    ).length;
    const remediationProgress =
      remediation.length > 0
        ? Math.round(
            remediation.reduce((s, r) => s + r.progressPct, 0) / remediation.length
          )
        : 0;

    // ── KRI ──────────────────────────────────────────────────────────────────
    const kriWithData = kriLatest.filter((k) => k.readings.length > 0);
    const kriGreen = kriWithData.filter((k) => k.readings[0].status === "GREEN").length;
    const kriRed = kriWithData.filter((k) => k.readings[0].status === "RED").length;
    const kriDeteriorating = kriWithData.filter(
      (k) => k.readings[0].trend === "DETERIORATING"
    ).length;

    // ── Training ─────────────────────────────────────────────────────────────
    const trainingDone = training.filter((t) => t.status === "COMPLETED").length;
    const boardTrained = training.some(
      (t) => t.audience === "BOARD" && t.status === "COMPLETED"
    );

    const workstreams: WorkstreamReadiness[] = [
      {
        key: "policy",
        label: "AI Policy Framework",
        href: "/policies",
        score: pct(policyLive, policies.length),
        total: policies.length,
        complete: policyLive,
        detail:
          policies.length === 0
            ? "Framework not yet installed"
            : policyOverdueReview > 0
            ? `${policyOverdueReview} document${policyOverdueReview === 1 ? "" : "s"} overdue for review`
            : `${policyLive} of ${policies.length} approved or published`,
      },
      {
        key: "aims",
        label: "AI Management System",
        href: "/aims",
        score: pct(aimsDone, aims.length),
        total: aims.length,
        complete: aimsDone,
        detail:
          aims.length === 0
            ? "AIMS not yet initialised"
            : `${aimsDone} of ${aims.length} ISO 42001 clauses implemented`,
      },
      {
        key: "soa",
        label: "Statement of Applicability",
        href: "/soa",
        score: pct(soaImplemented, soaApplicable.length),
        total: soaApplicable.length,
        complete: soaImplemented,
        detail:
          soa.length === 0
            ? "Annex A controls not yet loaded"
            : soaUnjustified > 0
            ? `${soaUnjustified} exclusion${soaUnjustified === 1 ? "" : "s"} missing justification`
            : `${soaImplemented} of ${soaApplicable.length} applicable controls implemented`,
      },
      {
        key: "free-ai",
        label: "RBI FREE-AI Alignment",
        href: "/free-ai",
        score: pct(freeAiPass, freeAi.length),
        total: freeAi.length,
        complete: freeAiPass,
        detail:
          freeAi.length === 0
            ? "FREE-AI assessment not yet started"
            : `${freeAiPass} of ${freeAi.length} items assessed as compliant`,
      },
      {
        key: "model-risk",
        label: "Model Risk Management",
        href: "/model-risk",
        score: pct(mrmValidated, modelRisk.length),
        total: modelRisk.length,
        complete: mrmValidated,
        detail:
          modelRisk.length === 0
            ? "No models registered for validation"
            : mrmOverdue > 0
            ? `${mrmOverdue} model${mrmOverdue === 1 ? "" : "s"} overdue for revalidation`
            : `${mrmValidated} of ${modelRisk.length} models validated`,
      },
      {
        key: "gap",
        label: "Gap Assessment",
        href: "/gap-assessment",
        score: pct(gapClosed, gapFindings.length),
        total: gapFindings.length,
        complete: gapClosed,
        detail:
          gapFindings.length === 0
            ? "No gap assessment findings recorded"
            : gapCritical > 0
            ? `${gapCritical} critical gap${gapCritical === 1 ? "" : "s"} still open`
            : `${gapClosed} of ${gapFindings.length} findings closed to target maturity`,
      },
      {
        key: "control-testing",
        label: "Control Testing",
        href: "/control-testing",
        score: pct(testsEffective, testsRun.length),
        total: controlTests.length,
        complete: testsEffective,
        detail:
          controlTests.length === 0
            ? "No control tests executed"
            : testsIneffective > 0
            ? `${testsIneffective} control${testsIneffective === 1 ? "" : "s"} assessed ineffective`
            : `${testsEffective} of ${testsRun.length} tested controls effective`,
      },
      {
        key: "ncr",
        label: "NCR & CAPA",
        href: "/ncr-capa",
        score: pct(ncrClosed, ncrs.length),
        total: ncrs.length,
        complete: ncrClosed,
        detail:
          ncrs.length === 0
            ? "No non-conformities raised"
            : ncrMajorOpen > 0
            ? `${ncrMajorOpen} major non-conformit${ncrMajorOpen === 1 ? "y" : "ies"} open`
            : `${ncrClosed} of ${ncrs.length} non-conformities closed`,
      },
      {
        key: "remediation",
        label: "Remediation Roadmap",
        href: "/remediation",
        score: remediationProgress,
        total: remediation.length,
        complete: remediationDone,
        detail:
          remediation.length === 0
            ? "Roadmap not yet defined"
            : remediationP1Open > 0
            ? `${remediationP1Open} P1 item${remediationP1Open === 1 ? "" : "s"} outstanding`
            : `${remediationDone} of ${remediation.length} items complete`,
      },
      {
        key: "kri",
        label: "Integrated Risk KRIs",
        href: "/kri",
        score: pct(kriGreen, kriWithData.length),
        total: kriLatest.length,
        complete: kriGreen,
        detail:
          kriLatest.length === 0
            ? "KRI set not yet configured"
            : kriRed > 0
            ? `${kriRed} KRI${kriRed === 1 ? "" : "s"} in red${kriDeteriorating > 0 ? `, ${kriDeteriorating} deteriorating` : ""}`
            : `${kriGreen} of ${kriWithData.length} KRIs within appetite`,
      },
      {
        key: "training",
        label: "Training & Enablement",
        href: "/training",
        score: pct(trainingDone, training.length),
        total: training.length,
        complete: trainingDone,
        detail:
          training.length === 0
            ? "No training programmes planned"
            : !boardTrained
            ? "Board-level AI awareness training outstanding"
            : `${trainingDone} of ${training.length} programmes delivered`,
      },
    ];

    // Overall readiness weights only the workstreams that have been started, so
    // an untouched module drags the score down through its zero rather than
    // being silently excluded — but a tenant with nothing set up reads 0, not NaN.
    const started = workstreams.filter((w) => w.total > 0);
    const overallReadiness =
      started.length > 0
        ? Math.round(started.reduce((s, w) => s + w.score, 0) / started.length)
        : 0;

    return ok({
      overallReadiness,
      workstreamsStarted: started.length,
      workstreamsTotal: workstreams.length,
      workstreams,
      blockers: {
        soaUnjustified,
        gapCritical,
        ncrMajorOpen,
        remediationP1Open,
        mrmOverdue,
        kriRed,
        testsIneffective,
        boardTrainingOutstanding: training.length > 0 && !boardTrained,
      },
    });
  } catch (err) {
    return serverError(err);
  }
});
