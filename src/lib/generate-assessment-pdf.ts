/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI Use Case Assessment — PDF Report Generator
 * Uses jsPDF (client-side only, loaded dynamically to avoid SSR)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssessmentReportData {
  useCase: {
    use_case_name: string;
    priority_score?: number;
    priority_tier?: string;
    score_breakdown?: {
      business_impact: number;
      data_readiness: number;
      decision_complexity: number;
      monetization: number;
      tech_feasibility: number;
      risk_compliance: number;
      org_readiness: number;
      rationale: string;
    };
    business_problem: string;
    ai_solution: string;
    expected_business_impact: string;
    agentic_ai_design?: {
      agents?: { agent_name: string; role: string; responsibilities: string[] }[];
      decision_flow?: string;
    };
    n8n_workflow?: {
      workflow_name?: string;
      trigger?: string;
      nodes?: { step?: number; name: string; node_type: string; description: string }[];
      connections?: { from: string; to: string }[];
      integrations?: string[];
      workflow_summary?: string;
    };
    implementation_plan?: {
      timeline_weeks?: string;
      phases?: { phase_name: string; duration: string; activities: string[] }[];
    };
    integration_architecture?: {
      systems_involved?: string[];
      data_flow?: string;
      api_requirements?: string[];
    };
  };
  // Discovery inputs
  assessmentId: string | null;
  industry: string;
  primaryObjective: string;
  targetKPI: string;
  kpiBaseline: string;
  kpiTarget: string;
  timeHorizon: string;
  orgProfile: string;
  painPoints: string[];
  valueChainStage: string;
  processType: string;
  decisionFrequency: string;
  dataQuality: string;
  dataVolume: string;
  dataFreshness: string;
  dataAccess: string;
  dataSources: string[];
  businessGoals: string[];
  estimatedRevenueImpact: string;
  estimatedCostSaving: string;
  transactionVolume: string;
  existingSystems: string[];
  regulatoryImpact: string;
  cloudReadiness: string;
  integrationComplexity: string;
  skillAvailability: string[];
}

// ── Colour palette (RGB) ──────────────────────────────────────────────────────
type RGB = [number, number, number];

const C = {
  navy:        [12, 24, 58]    as RGB,
  navyLight:   [24, 42, 90]    as RGB,
  blue:        [37, 99, 235]   as RGB,
  blueLight:   [219, 234, 254] as RGB,
  green:       [4, 120, 87]    as RGB,
  greenLight:  [209, 250, 229] as RGB,
  amber:       [180, 83, 9]    as RGB,
  amberLight:  [254, 243, 199] as RGB,
  red:         [185, 28, 28]   as RGB,
  redLight:    [254, 226, 226] as RGB,
  dark:        [15, 23, 42]    as RGB,
  body:        [30, 41, 59]    as RGB,
  muted:       [100, 116, 139] as RGB,
  border:      [203, 213, 225] as RGB,
  bgSection:   [248, 250, 252] as RGB,
  white:       [255, 255, 255] as RGB,
};

// Page constants (A4 mm)
const W = 210;
const H = 297;
const ML = 15; // margin left
const MR = 15; // margin right
const MT = 15; // margin top
const CW = W - ML - MR; // content width = 180

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAssessmentPDF(data: AssessmentReportData) {
  // Dynamic import — keeps jsPDF out of the SSR bundle
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let pageNum = 0;

  // ── Utilities ────────────────────────────────────────────────────────────────

  function addPage() {
    doc.addPage();
    pageNum++;
    addPageFooter();
  }

  function addPageFooter() {
    const y = H - 8;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(ML, y - 2, W - MR, y - 2);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("AI Governance Control Tower — AI Use Case Assessment Report", ML, y);
    doc.text(`Page ${pageNum + 1}`, W - MR, y, { align: "right" });
    doc.text("CONFIDENTIAL", W / 2, y, { align: "center" });
  }

  function ensureSpace(currentY: number, needed: number): number {
    if (currentY + needed > H - 20) {
      addPage();
      return MT + 5;
    }
    return currentY;
  }

  function sectionHeader(text: string, y: number, color: RGB = C.navy): number {
    y = ensureSpace(y, 12);
    doc.setFillColor(...color);
    doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, "F");
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(text.toUpperCase(), ML + 4, y + 5.5);
    return y + 11;
  }

  function label(text: string, x: number, y: number) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text(text.toUpperCase(), x, y);
  }

  function body(text: string, x: number, y: number, maxW = CW, opts?: { align?: "left" | "right" | "center" }): number {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.body);
    const lines = doc.splitTextToSize(text || "—", maxW);
    doc.text(lines, x, y, opts);
    return y + lines.length * 4.5;
  }

  function bodyBold(text: string, x: number, y: number, maxW = CW): number {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    const lines = doc.splitTextToSize(text || "—", maxW);
    doc.text(lines, x, y);
    return y + lines.length * 4.5;
  }

  function bulletList(items: string[], x: number, y: number, maxW = CW - 6): number {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.body);
    for (const item of items) {
      y = ensureSpace(y, 6);
      doc.setFillColor(...C.blue);
      doc.circle(x + 1.2, y - 1.2, 0.9, "F");
      const lines = doc.splitTextToSize(item, maxW);
      doc.text(lines, x + 4, y);
      y += lines.length * 4.5;
    }
    return y;
  }

  function keyValue(key: string, value: string, x: number, y: number, colW = 85): number {
    label(key, x, y);
    y += 4;
    body(value || "—", x, y, colW - 4);
    return y + 5;
  }

  function twoCol(
    leftLabel: string, leftVal: string,
    rightLabel: string, rightVal: string,
    y: number
  ): number {
    const col2X = ML + CW / 2 + 3;
    const colW = CW / 2 - 3;
    label(leftLabel, ML, y);
    label(rightLabel, col2X, y);
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.body);
    const lLines = doc.splitTextToSize(leftVal || "—", colW);
    const rLines = doc.splitTextToSize(rightVal || "—", colW);
    doc.text(lLines, ML, y);
    doc.text(rLines, col2X, y);
    return y + Math.max(lLines.length, rLines.length) * 4.5 + 3;
  }

  function scoreBar(dimensionLabel: string, score: number, x: number, y: number, barW = 60) {
    const maxScore = 20; // per dimension (score out of 20)
    const pct = Math.min(score / maxScore, 1);
    const barColor: RGB =
      score >= 16 ? C.green :
      score >= 12 ? C.blue  :
      score >= 8  ? C.amber : C.red;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.body);
    doc.text(dimensionLabel, x, y);
    // track bar bg
    doc.setFillColor(...C.border);
    doc.roundedRect(x + 50, y - 3.5, barW, 4, 1, 1, "F");
    // track bar fill
    doc.setFillColor(...barColor);
    doc.roundedRect(x + 50, y - 3.5, barW * pct, 4, 1, 1, "F");
    // score text
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...barColor);
    doc.text(`${score}/20`, x + 50 + barW + 2, y);
  }

  function divider(y: number, color: RGB = C.border): number {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(ML, y, W - MR, y);
    return y + 4;
  }

  function tagRow(tags: string[], x: number, y: number): number {
    let cx = x;
    const tagH = 5.5;
    const pad = 3;
    for (const tag of tags) {
      if (!tag) continue;
      const tw = doc.getTextWidth(tag) + pad * 2;
      if (cx + tw > W - MR) {
        y += tagH + 2;
        cx = x;
      }
      doc.setFillColor(...C.blueLight);
      doc.roundedRect(cx, y - 3.8, tw, tagH, 1.2, 1.2, "F");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.blue);
      doc.text(tag, cx + pad, y);
      cx += tw + 2;
    }
    return y + tagH;
  }

  // ── PAGE 1: COVER ────────────────────────────────────────────────────────────
  pageNum = 0;

  // Dark header block
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 80, "F");

  // Subtle grid pattern (decorative lines)
  doc.setDrawColor(255, 255, 255, 0.05);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 20; i++) {
    doc.line(0, i * 8, W, i * 8);
  }

  // Report type label
  doc.setFillColor(...C.blue);
  doc.roundedRect(ML, 18, 68, 7, 1.5, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("AI USE CASE ASSESSMENT REPORT", ML + 3, 23);

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  const titleLines = doc.splitTextToSize(data.useCase.use_case_name || "AI Use Case Report", CW);
  doc.text(titleLines, ML, 38);

  // Priority score badge
  const score = data.useCase.priority_score ?? 0;
  const tier = data.useCase.priority_tier ?? "—";
  const tierColor: RGB =
    score >= 80 ? C.green :
    score >= 60 ? C.blue  :
    score >= 40 ? C.amber : C.red;

  doc.setFillColor(...tierColor);
  doc.roundedRect(ML, 60, 45, 12, 2, 2, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text(`${score}`, ML + 5, 69);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`/ 100  ·  ${tier}`, ML + 16, 69);

  // Below header — metadata cards
  const metaY = 88;
  const cardW = (CW - 8) / 3;

  const metaCards = [
    { label: "Industry", value: data.industry },
    { label: "Objective", value: data.primaryObjective || "—" },
    { label: "Timeline", value: data.timeHorizon },
  ];

  metaCards.forEach((card, idx) => {
    const cx = ML + idx * (cardW + 4);
    doc.setFillColor(...C.bgSection);
    doc.roundedRect(cx, metaY, cardW, 18, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.muted);
    doc.text(card.label.toUpperCase(), cx + 4, metaY + 6);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    const lines = doc.splitTextToSize(card.value, cardW - 8);
    doc.text(lines[0], cx + 4, metaY + 13);
  });

  // KPI row
  let y = metaY + 25;
  if (data.targetKPI) {
    doc.setFillColor(...C.blueLight);
    doc.roundedRect(ML, y, CW, 14, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.blue);
    doc.text("TARGET KPI", ML + 4, y + 5.5);
    doc.setFontSize(10);
    doc.setTextColor(...C.navy);
    doc.text(
      `${data.targetKPI}  ·  ${data.kpiBaseline || "?"} → ${data.kpiTarget || "?"}`,
      ML + 4, y + 11
    );
    y += 19;
  }

  // Organisation profile preview
  y += 2;
  label("ORGANISATION PROFILE", ML, y);
  y += 4;
  y = body(data.orgProfile.slice(0, 300) + (data.orgProfile.length > 300 ? "…" : ""), ML, y, CW);

  // Generation info
  y += 4;
  divider(y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.muted);
  const now = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Generated: ${now}`, ML, y);
  if (data.assessmentId) {
    doc.text(`Assessment ID: ${data.assessmentId.slice(0, 12)}`, ML + 90, y);
  }
  doc.text("AI Governance Control Tower · aigovernancetower.com", W - MR, y, { align: "right" });

  // Cover footer
  doc.setFillColor(...C.navy);
  doc.rect(0, H - 12, W, 12, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.white);
  doc.text("CONFIDENTIAL — For internal use only", W / 2, H - 5, { align: "center" });

  // ── PAGE 2: EXECUTIVE SUMMARY ────────────────────────────────────────────────
  addPage();
  y = MT;

  // Page title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navy);
  doc.text("Executive Summary", ML, y + 6);
  y += 14;

  // Score hero card
  doc.setFillColor(...C.navy);
  doc.roundedRect(ML, y, CW, 22, 2, 2, "F");

  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...tierColor);
  doc.text(`${score}`, ML + 8, y + 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.white);
  doc.text("/100 Priority Score", ML + 22, y + 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(tier, ML + 22, y + 17);

  // Summary text on right of hero
  const summaryText = data.useCase.expected_business_impact || data.useCase.ai_solution || "";
  const summaryLines = doc.splitTextToSize(summaryText.slice(0, 200), CW - 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.white);
  doc.text(summaryLines.slice(0, 3), ML + 55, y + 8);

  y += 27;

  // Score breakdown bars
  if (data.useCase.score_breakdown) {
    y = sectionHeader("7-Dimension Priority Score Breakdown", y);
    y += 2;

    const sb = data.useCase.score_breakdown;
    const dims = [
      ["Business Impact (25%)",       sb.business_impact],
      ["Data Readiness (20%)",         sb.data_readiness],
      ["Decision Complexity (15%)",    sb.decision_complexity],
      ["Monetization Potential (15%)", sb.monetization],
      ["Tech Feasibility (10%)",       sb.tech_feasibility],
      ["Risk & Compliance (10%)",      sb.risk_compliance],
      ["Org Readiness (5%)",           sb.org_readiness],
    ] as [string, number][];

    for (const [dimLabel, dimScore] of dims) {
      y = ensureSpace(y, 8);
      scoreBar(dimLabel, dimScore, ML, y);
      y += 7;
    }

    if (sb.rationale) {
      y += 2;
      doc.setFillColor(...C.bgSection);
      doc.roundedRect(ML, y, CW, 1, 0, 0, "F"); // placeholder
      label("SCORING RATIONALE", ML, y + 4);
      y += 8;
      y = body(sb.rationale, ML, y, CW);
    }
    y += 4;
  }

  // Key metrics 2-col
  y = ensureSpace(y, 30);
  y = sectionHeader("Key Discovery Metrics", y);
  y += 2;
  y = twoCol("KPI TARGET", `${data.targetKPI || "—"} (${data.kpiBaseline || "?"} → ${data.kpiTarget || "?"})`,
             "TIME HORIZON", data.timeHorizon, y);
  y = twoCol("INDUSTRY", data.industry,
             "PRIMARY OBJECTIVE", data.primaryObjective || "—", y);
  y = twoCol("REVENUE IMPACT", data.estimatedRevenueImpact || "—",
             "COST SAVING", data.estimatedCostSaving || "—", y);

  // Business goals
  if (data.businessGoals.length > 0) {
    y += 2;
    y = ensureSpace(y, 20);
    y = sectionHeader("Business Goals", y, C.navyLight);
    y += 2;
    y = bulletList(data.businessGoals, ML, y);
  }

  // Expected outcomes
  y += 2;
  y = ensureSpace(y, 20);
  y = sectionHeader("Expected Business Impact", y, C.navyLight);
  y += 2;
  y = body(data.useCase.expected_business_impact || "—", ML, y, CW);

  // ── PAGE 3: DISCOVERY CONTEXT ────────────────────────────────────────────────
  addPage();
  y = MT;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navy);
  doc.text("Discovery Context", ML, y + 6);
  y += 14;

  // Step 1: Business Context
  y = sectionHeader("Step 1 — Business Context & Objectives", y);
  y += 2;
  y = twoCol("PRIMARY OBJECTIVE", data.primaryObjective || "—",
             "TIME HORIZON", data.timeHorizon, y);
  y = twoCol("TARGET KPI", data.targetKPI || "—",
             "BASELINE → TARGET", `${data.kpiBaseline || "?"} → ${data.kpiTarget || "?"}`, y);

  if (data.businessGoals.length > 0) {
    y += 2;
    label("BUSINESS GOALS", ML, y);
    y += 4;
    y = tagRow(data.businessGoals, ML, y);
    y += 4;
  }

  // Step 2: Process & Decisions
  y += 2;
  y = ensureSpace(y, 30);
  y = sectionHeader("Step 2 — Process & Decision Intelligence", y);
  y += 2;
  y = twoCol("VALUE CHAIN STAGE", data.valueChainStage || "—",
             "PROCESS TYPE", data.processType || "—", y);
  if (data.decisionFrequency) {
    y = twoCol("DECISION FREQUENCY", data.decisionFrequency, "—", "—", y);
  }
  if (data.painPoints.length > 0) {
    label("PAIN POINTS IDENTIFIED", ML, y);
    y += 4;
    y = bulletList(data.painPoints, ML, y);
    y += 2;
  }

  // Step 3: Data Readiness
  y += 2;
  y = ensureSpace(y, 30);
  y = sectionHeader("Step 3 — Data Readiness Assessment", y);
  y += 2;
  y = twoCol("DATA QUALITY", data.dataQuality || "—",
             "DATA VOLUME", data.dataVolume || "—", y);
  y = twoCol("DATA FRESHNESS", data.dataFreshness || "—",
             "DATA ACCESS", data.dataAccess || "—", y);
  if (data.dataSources.length > 0) {
    label("DATA SOURCES", ML, y);
    y += 4;
    y = tagRow(data.dataSources, ML, y);
    y += 4;
  }

  // Step 4: Customer & Monetization
  y += 2;
  y = ensureSpace(y, 25);
  y = sectionHeader("Step 4 — Customer & Monetization Potential", y);
  y += 2;
  y = twoCol("ESTIMATED REVENUE IMPACT", data.estimatedRevenueImpact || "—",
             "ESTIMATED COST SAVING", data.estimatedCostSaving || "—", y);
  if (data.transactionVolume) {
    y = twoCol("TRANSACTION VOLUME", data.transactionVolume, "—", "—", y);
  }

  // Step 5: Technology & Governance
  y += 2;
  y = ensureSpace(y, 30);
  y = sectionHeader("Step 5 — Technology, Governance & Org Readiness", y);
  y += 2;
  y = twoCol("CLOUD READINESS", data.cloudReadiness || "—",
             "INTEGRATION COMPLEXITY", data.integrationComplexity || "—", y);
  y = twoCol("REGULATORY IMPACT", data.regulatoryImpact || "—",
             "—", "—", y);
  if (data.existingSystems.length > 0) {
    label("EXISTING SYSTEMS / TOOLS", ML, y);
    y += 4;
    y = tagRow(data.existingSystems, ML, y);
    y += 4;
  }
  if (data.skillAvailability.length > 0) {
    label("AVAILABLE SKILLS", ML, y);
    y += 4;
    y = tagRow(data.skillAvailability, ML, y);
    y += 4;
  }

  // ── PAGE 4: BUSINESS PROBLEM & AI SOLUTION ───────────────────────────────────
  addPage();
  y = MT;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navy);
  doc.text("Business Problem & AI Solution", ML, y + 6);
  y += 14;

  // Problem statement
  y = sectionHeader("Business Problem Statement", y);
  y += 2;
  doc.setFillColor(...C.redLight);
  doc.roundedRect(ML, y, CW, 4, 0, 0, "F"); // spacer
  y += 1;
  y = body(data.useCase.business_problem, ML, y, CW);
  y += 4;

  // AI Solution
  y = ensureSpace(y, 25);
  y = sectionHeader("Proposed AI Solution", y, C.navyLight);
  y += 2;
  y = body(data.useCase.ai_solution, ML, y, CW);
  y += 4;

  // Agentic AI Design
  const aad = data.useCase.agentic_ai_design;
  if (aad && (aad.agents?.length || aad.decision_flow)) {
    y = ensureSpace(y, 20);
    y = sectionHeader("Agentic AI Design", y);
    y += 2;

    if (aad.decision_flow) {
      label("DECISION FLOW", ML, y);
      y += 4;
      y = body(aad.decision_flow, ML, y, CW);
      y += 4;
    }

    if (aad.agents && aad.agents.length > 0) {
      label("AI AGENTS", ML, y);
      y += 5;

      for (const agent of aad.agents) {
        y = ensureSpace(y, 20);
        // Agent card
        doc.setFillColor(...C.bgSection);
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        const agentCardH = 8 + (agent.responsibilities?.length || 0) * 4.5;
        doc.roundedRect(ML, y, CW, agentCardH, 1.5, 1.5, "FD");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.navy);
        doc.text(agent.agent_name, ML + 3, y + 5.5);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...C.muted);
        doc.text(agent.role, ML + 3, y + 10);

        let agentY = y + 14;
        for (const resp of (agent.responsibilities || [])) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...C.body);
          doc.setFillColor(...C.blue);
          doc.circle(ML + 5, agentY - 1, 0.8, "F");
          doc.text(resp, ML + 8, agentY, { maxWidth: CW - 10 });
          agentY += 4.5;
        }
        y = agentY + 4;
      }
    }
  }

  // ROI section (derived from score_breakdown + inputs)
  y = ensureSpace(y, 35);
  y = sectionHeader("ROI & Financial Impact", y);
  y += 2;

  const roiCards = [
    { label: "Revenue Impact", value: data.estimatedRevenueImpact || "Quantify post-pilot", color: C.green, bg: C.greenLight },
    { label: "Cost Savings", value: data.estimatedCostSaving || "Quantify post-pilot", color: C.blue, bg: C.blueLight },
    { label: "Transaction Volume", value: data.transactionVolume || "—", color: C.amber, bg: C.amberLight },
  ];

  const roiCardW = (CW - 8) / 3;
  roiCards.forEach((card, idx) => {
    const cx = ML + idx * (roiCardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, roiCardW, 18, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.label.toUpperCase(), cx + 3, y + 6);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    const vLines = doc.splitTextToSize(card.value, roiCardW - 6);
    doc.text(vLines[0], cx + 3, y + 13);
  });
  y += 22;

  // Monetization score context
  if (data.useCase.score_breakdown) {
    const mScore = data.useCase.score_breakdown.monetization;
    const mPct = Math.round((mScore / 20) * 100);
    y += 2;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.body);
    doc.text(`Monetization Potential Score: ${mScore}/20 (${mPct}th percentile) — included in the ${score}/100 priority score.`, ML, y);
    y += 6;
  }

  // ── PAGE 5: n8n WORKFLOW ──────────────────────────────────────────────────────
  const wf = data.useCase.n8n_workflow;
  if (wf) {
    addPage();
    y = MT;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navy);
    doc.text("n8n Automation Workflow", ML, y + 6);
    y += 14;

    // Workflow summary card
    y = sectionHeader("Workflow Overview", y);
    y += 2;
    y = twoCol("WORKFLOW NAME", wf.workflow_name || "—",
               "TRIGGER", wf.trigger || "—", y);

    if (wf.workflow_summary) {
      y += 2;
      label("WORKFLOW SUMMARY", ML, y);
      y += 4;
      y = body(wf.workflow_summary, ML, y, CW);
      y += 4;
    }

    if (wf.integrations && wf.integrations.length > 0) {
      label("INTEGRATIONS", ML, y);
      y += 4;
      y = tagRow(wf.integrations, ML, y);
      y += 4;
    }

    // Nodes table
    if (wf.nodes && wf.nodes.length > 0) {
      y = ensureSpace(y, 20);
      y = sectionHeader("Workflow Nodes", y);
      y += 2;

      const nodeRows = wf.nodes.map((n, i) => [
        String(n.step ?? i + 1),
        n.name,
        n.node_type,
        n.description,
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Node Name", "Type", "Description"]],
        body: nodeRows,
        margin: { left: ML, right: MR },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          textColor: C.body,
          lineColor: C.border,
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: C.navy,
          textColor: C.white,
          fontStyle: "bold",
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: C.bgSection },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 45 },
          2: { cellWidth: 50 },
          3: { cellWidth: 72 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Connections
    if (wf.connections && wf.connections.length > 0) {
      y = ensureSpace(y, 20);
      y = sectionHeader("Workflow Connections", y, C.navyLight);
      y += 2;

      const connRows = wf.connections.map((c, i) => [`${i + 1}`, c.from, "→", c.to]);
      autoTable(doc, {
        startY: y,
        head: [["#", "From Node", "", "To Node"]],
        body: connRows,
        margin: { left: ML, right: MR },
        styles: { fontSize: 8, cellPadding: 2, textColor: C.body, lineColor: C.border, lineWidth: 0.2 },
        headStyles: { fillColor: C.navyLight, textColor: C.white, fontStyle: "bold" },
        alternateRowStyles: { fillColor: C.bgSection },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 72 },
          2: { cellWidth: 12, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 72 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ── PAGE 6: IMPLEMENTATION PLAN ───────────────────────────────────────────────
  const plan = data.useCase.implementation_plan;
  if (plan) {
    addPage();
    y = MT;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navy);
    doc.text("Implementation Roadmap", ML, y + 6);
    y += 14;

    y = sectionHeader("Implementation Overview", y);
    y += 2;
    if (plan.timeline_weeks) {
      doc.setFillColor(...C.blueLight);
      doc.roundedRect(ML, y, CW, 10, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...C.navy);
      doc.text(`Total Timeline: ${plan.timeline_weeks}`, ML + 4, y + 6.5);
      y += 14;
    }

    const phases = Array.isArray(plan.phases) ? plan.phases : [];
    if (phases.length > 0) {
      y = sectionHeader("Implementation Phases", y);
      y += 2;

      phases.forEach((phase, idx) => {
        y = ensureSpace(y, 30);

        // Phase header
        const phaseColors: RGB[] = [C.blue, C.green, C.amber, C.navy];
        const pc = phaseColors[idx % phaseColors.length];

        doc.setFillColor(...pc);
        doc.roundedRect(ML, y, CW, 7.5, 1.5, 1.5, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.white);
        doc.text(`Phase ${idx + 1}: ${phase.phase_name}`, ML + 3, y + 5);
        doc.text(phase.duration, W - MR - 2, y + 5, { align: "right" });
        y += 10;

        const acts = Array.isArray(phase.activities) ? phase.activities : [];
        y = bulletList(acts, ML + 4, y);
        y += 5;
      });
    }

    // Gantt-like timeline visual
    if (phases.length > 0) {
      y = ensureSpace(y, phases.length * 9 + 20);
      y = sectionHeader("Phase Timeline Overview", y, C.navyLight);
      y += 4;

      const barColors: RGB[] = [C.blue, C.green, C.amber, C.navy, C.muted];
      const timelineW = CW - 55;
      const segW = timelineW / phases.length;

      phases.forEach((phase, idx) => {
        const bx = ML + 52 + idx * segW;
        const bc = barColors[idx % barColors.length];
        doc.setFillColor(...bc);
        doc.roundedRect(bx + 1, y, segW - 2, 6, 1, 1, "F");
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.white);
        const phLabel = `P${idx + 1}`;
        doc.text(phLabel, bx + segW / 2, y + 4.2, { align: "center" });

        // Left label
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.body);
        const shortName = phase.phase_name.length > 20
          ? phase.phase_name.slice(0, 18) + "…"
          : phase.phase_name;
        doc.text(shortName, ML, y + 4.2);

        y += 8.5;
      });
    }
  }

  // ── PAGE 7: INTEGRATION ARCHITECTURE ─────────────────────────────────────────
  const arch = data.useCase.integration_architecture;
  if (arch) {
    addPage();
    y = MT;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navy);
    doc.text("Integration Architecture", ML, y + 6);
    y += 14;

    // Systems involved
    const systems = Array.isArray(arch.systems_involved) ? arch.systems_involved : [];
    if (systems.length > 0) {
      y = sectionHeader("Systems & Components", y);
      y += 2;

      // Horizontal system diagram
      const sysW = Math.min(36, (CW - (systems.length - 1) * 6) / systems.length);
      systems.forEach((sys, idx) => {
        const sx = ML + idx * (sysW + 6);
        const sy = y;

        doc.setFillColor(...C.navy);
        doc.roundedRect(sx, sy, sysW, 12, 2, 2, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.white);
        const sLines = doc.splitTextToSize(sys, sysW - 4);
        doc.text(sLines[0], sx + sysW / 2, sy + 7, { align: "center" });

        // Arrow to next
        if (idx < systems.length - 1) {
          const ax = sx + sysW;
          doc.setDrawColor(...C.blue);
          doc.setLineWidth(0.5);
          doc.line(ax + 0.5, sy + 6, ax + 5.5, sy + 6);
          // Arrowhead
          doc.triangle(ax + 5.5, sy + 4.5, ax + 5.5, sy + 7.5, ax + 7, sy + 6, "F");
        }
      });
      y += 18;
    }

    // Data flow
    if (arch.data_flow) {
      y = ensureSpace(y, 25);
      y = sectionHeader("Data Flow", y);
      y += 2;

      doc.setFillColor(...C.bgSection);
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      const dfLines = doc.splitTextToSize(arch.data_flow, CW - 8);
      const dfH = dfLines.length * 5 + 8;
      doc.roundedRect(ML, y, CW, dfH, 2, 2, "FD");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.body);
      doc.text(dfLines, ML + 4, y + 7);
      y += dfH + 6;
    }

    // API requirements
    const apis = Array.isArray(arch.api_requirements) ? arch.api_requirements : [];
    if (apis.length > 0) {
      y = ensureSpace(y, 20);
      y = sectionHeader("API Requirements", y, C.navyLight);
      y += 2;

      const apiRows = apis.map((a, i) => [`${i + 1}`, a]);
      autoTable(doc, {
        startY: y,
        head: [["#", "API / Integration Endpoint"]],
        body: apiRows,
        margin: { left: ML, right: MR },
        styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C.body, lineColor: C.border, lineWidth: 0.2 },
        headStyles: { fillColor: C.navyLight, textColor: C.white, fontStyle: "bold" },
        alternateRowStyles: { fillColor: C.bgSection },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: CW - 10 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Existing systems alignment
    if (data.existingSystems.length > 0) {
      y = ensureSpace(y, 25);
      y = sectionHeader("Existing Systems in Scope", y, C.navyLight);
      y += 2;
      y = tagRow(data.existingSystems, ML, y);
      y += 4;
    }
  }

  // ── PAGE 8: APPENDIX — METHODOLOGY ───────────────────────────────────────────
  addPage();
  y = MT;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.navy);
  doc.text("Appendix — Assessment Methodology", ML, y + 6);
  y += 14;

  y = sectionHeader("7-Dimension Scoring Model", y);
  y += 2;

  const methodRows = [
    ["Business Impact",       "25%", "Revenue/cost impact magnitude, strategic alignment, urgency"],
    ["Data Readiness",        "20%", "Data availability, quality, volume, freshness, access"],
    ["Decision Complexity",   "15%", "Subjectivity, frequency, volume of decisions to automate"],
    ["Monetization",          "15%", "Revenue uplift, cost saving, payback timeline"],
    ["Tech Feasibility",      "10%", "Integration complexity, cloud readiness, build vs buy"],
    ["Risk & Compliance",     "10%", "Regulatory exposure, explainability need, bias risk"],
    ["Org Readiness",          "5%", "Skill availability, change management, executive sponsorship"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Dimension", "Weight", "What is Scored"]],
    body: methodRows,
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.body, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: "bold" },
    alternateRowStyles: { fillColor: C.bgSection },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 120 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  y = sectionHeader("Priority Tiers", y, C.navyLight);
  y += 2;

  const tierRows = [
    ["80–100", "Tier 1 — Immediate", "Start this quarter. High ROI, high feasibility. Assign a team now."],
    ["60–79",  "Tier 2 — Pilot/MVP", "Begin discovery and prototyping. Board for funding in next cycle."],
    ["40–59",  "Tier 3 — Backlog",   "Valid use case but data or org readiness needs improvement first."],
    ["< 40",   "Reject / Revisit",   "Not ready. Revisit in 6–12 months after addressing root constraints."],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Score Range", "Tier", "Recommended Action"]],
    body: tierRows,
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 2.5, textColor: C.body, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.navyLight, textColor: C.white, fontStyle: "bold" },
    alternateRowStyles: { fillColor: C.bgSection },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: 110 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Platform note
  y = ensureSpace(y, 30);
  doc.setFillColor(...C.navy);
  doc.roundedRect(ML, y, CW, 22, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("AI Governance Control Tower", ML + 4, y + 8);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("DPDP Act 2023 · ISO 42001:2023 · EU AI Act compliant", ML + 4, y + 14);
  doc.setTextColor(180, 200, 255);
  doc.text("aigovernancetower.com", W - MR - 4, y + 14, { align: "right" });

  // ── Save ──────────────────────────────────────────────────────────────────────
  const slug = (data.useCase.use_case_name || "ai-use-case")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40);
  doc.save(`${slug}-report.pdf`);
}
