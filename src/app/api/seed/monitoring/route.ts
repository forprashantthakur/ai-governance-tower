import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Seed monitoring data: 30 realistic prompt logs across last 14 days
// Call: GET /api/seed/monitoring?secret=SEED_SECRET_2024
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "SEED_SECRET_2024") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch existing models and users — don't create anything new
    const models = await prisma.aIModel.findMany({ take: 5, orderBy: { createdAt: "asc" } });
    const users  = await prisma.user.findMany({ take: 3, orderBy: { createdAt: "asc" } });
    const agents = await prisma.agent.findMany({ take: 2, orderBy: { createdAt: "asc" } });

    if (models.length === 0 || users.length === 0) {
      return NextResponse.json(
        { error: "No models or users found. Run /api/seed first." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    // Helper: pick a random item from array
    function pick<T>(arr: T[]): T {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // 30 realistic log entries spread across last 14 days
    const logTemplates = [
      // Day 14 ago
      { daysAgo: 14, prompt: "Analyze DPDP compliance status for Q1 2026", response: "DPDP compliance: 4 controls reviewed, 3 passing, 1 partial. No critical gaps identified.", latencyMs: 1800, inputTokens: 620, outputTokens: 310, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 14, prompt: "Run risk assessment on Credit Risk Scorer model", response: "Risk level: HIGH. Overall score 78/100. Bias score 0.07 exceeds threshold 0.05.", latencyMs: 3200, inputTokens: 1100, outputTokens: 850, toxicityScore: 0.01, accuracyScore: 0.94, biasScore: 0.07, flagged: true, flagReason: "Bias score exceeds threshold", isHallucination: false, isPolicyViolation: false },

      // Day 13 ago
      { daysAgo: 13, prompt: "Check model drift for Fraud Detection Engine", response: "Model drift detected. Accuracy dropped from 0.97 to 0.91. Recommend retraining.", latencyMs: 2700, inputTokens: 890, outputTokens: 670, toxicityScore: 0.02, accuracyScore: 0.91, biasScore: 0.03, flagged: true, flagReason: "Accuracy drop below threshold", isHallucination: false, isPolicyViolation: false },
      { daysAgo: 13, prompt: "Generate executive summary of AI governance posture", response: "5 AI models active. 2 high-risk. Compliance score 72%. 2 open incidents.", latencyMs: 2100, inputTokens: 780, outputTokens: 420, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 12 ago
      { daysAgo: 12, prompt: "Assess fairness of Customer Churn Predictor across demographic groups", response: "Fairness analysis: Gender parity score 0.82. Age group disparity detected for 65+ cohort. Review recommended.", latencyMs: 4100, inputTokens: 1350, outputTokens: 920, toxicityScore: 0.02, accuracyScore: 0.88, biasScore: 0.06, flagged: true, flagReason: "Demographic disparity detected", isHallucination: false, isPolicyViolation: false },
      { daysAgo: 12, prompt: "List all compliance controls with FAIL status", response: "2 controls with FAIL status: ISO42001-6.1 (Incident Response) and ISO42001-7.1 (Human Oversight). Immediate action required.", latencyMs: 1500, inputTokens: 450, outputTokens: 280, toxicityScore: 0.01, accuracyScore: 0.98, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 11 ago
      { daysAgo: 11, prompt: "Summarize latest AI model performance metrics", response: "Credit Risk: 78 score. Fraud Detection: 85 score. Churn Predictor: 45 score. NLP Classifier: 25 score.", latencyMs: 2300, inputTokens: 820, outputTokens: 490, toxicityScore: 0.01, accuracyScore: 0.95, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 11, prompt: "What is the EU AI Act deadline for high-risk AI systems?", response: "Under EU AI Act, high-risk AI systems must comply by August 2026. Conformity assessments required before deployment.", latencyMs: 1200, inputTokens: 380, outputTokens: 210, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 11, prompt: "Generate a policy violation report for all flagged interactions", response: "3 policy violations detected in last 30 days. 1 resolved. 2 pending review. See flagged log IDs: FL-001, FL-003.", latencyMs: 1900, inputTokens: 640, outputTokens: 390, toxicityScore: 0.03, accuracyScore: 0.93, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 10 ago
      { daysAgo: 10, prompt: "Detect hallucinations in last 100 model responses", response: "Hallucination rate: 2.3%. 2 confirmed hallucinations in regulatory context. Recommend enhanced validation pipeline.", latencyMs: 5000, inputTokens: 1480, outputTokens: 980, toxicityScore: 0.02, accuracyScore: 0.85, biasScore: 0.03, flagged: true, flagReason: "Hallucination detected in output", isHallucination: true, isPolicyViolation: false },
      { daysAgo: 10, prompt: "Check data consent records for Customer PII Database", response: "42 records missing consent documentation. DPDP compliance gap identified. Immediate remediation required.", latencyMs: 2600, inputTokens: 920, outputTokens: 560, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 9 ago
      { daysAgo: 9, prompt: "Generate mitigation plan for high-risk AI models", response: "Credit Risk Scorer: Implement fairness constraints, quarterly bias testing. Fraud Detection: Retrain with Q4 2025 data, add temporal drift detection.", latencyMs: 3800, inputTokens: 1260, outputTokens: 870, toxicityScore: 0.01, accuracyScore: 0.95, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 9, prompt: "What are the penalties under DPDP Act for non-compliance?", response: "DPDP Act penalties: Up to ₹250 crore for data breaches. ₹200 crore for non-compliance with data principal rights. Significant financial risk.", latencyMs: 1700, inputTokens: 510, outputTokens: 320, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 8 ago
      { daysAgo: 8, prompt: "Analyze toxicity in recent LLM outputs for compliance violations", response: "Toxicity analysis complete. 1 output with score 0.32 flagged. Content: discussion of protected attribute. Policy violation raised.", latencyMs: 3100, inputTokens: 1050, outputTokens: 720, toxicityScore: 0.32, accuracyScore: 0.78, biasScore: 0.08, flagged: true, flagReason: "High toxicity score — policy violation", isHallucination: false, isPolicyViolation: true },
      { daysAgo: 8, prompt: "Summarize ISO 42001 compliance gaps for board presentation", response: "ISO 42001 gap summary: 3 controls passing, 2 failing, 3 partial. Key gaps: incident response (6.1) and human oversight (7.1). Recommend immediate action on both.", latencyMs: 2400, inputTokens: 830, outputTokens: 490, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 8, prompt: "Review explainability documentation for NLP Document Classifier", response: "Explainability score: 55/100. LIME explanations available but not integrated in production. SHAP values not computed. Significant gap for regulatory review.", latencyMs: 2900, inputTokens: 970, outputTokens: 630, toxicityScore: 0.01, accuracyScore: 0.94, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 7 ago
      { daysAgo: 7, prompt: "Identify models without human oversight", response: "1 model without human oversight: Employee Sentiment Analyzer (DEPRECATED). All active models have human oversight enabled.", latencyMs: 1300, inputTokens: 420, outputTokens: 240, toxicityScore: 0.01, accuracyScore: 0.98, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 7, prompt: "Generate audit trail for model approval decisions in Q1 2026", response: "Audit trail: 5 model reviews conducted. 3 approved, 1 rejected (Sentiment Analyzer), 1 pending (Churn Predictor).", latencyMs: 2200, inputTokens: 760, outputTokens: 440, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 6 ago
      { daysAgo: 6, prompt: "Assess privacy impact of Fraud Detection Engine on data subjects", response: "Privacy Impact Assessment: HIGH sensitivity data processed. 3 data subject categories affected. Recommend DPIA before next model update.", latencyMs: 3500, inputTokens: 1180, outputTokens: 790, toxicityScore: 0.02, accuracyScore: 0.93, biasScore: 0.03, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 6, prompt: "Run compliance check against DPDP Section 7 requirements", response: "DPDP Section 7 compliance: Notice provision — PASS. Consent mechanism — PARTIAL. Purpose limitation — PASS. Data minimization — PASS.", latencyMs: 2000, inputTokens: 680, outputTokens: 380, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 5 ago
      { daysAgo: 5, prompt: "What controls are needed for high-risk AI under EU AI Act Annex III?", response: "EU AI Act Annex III high-risk requirements: 1) Risk management system 2) Data governance 3) Technical documentation 4) Transparency 5) Human oversight 6) Accuracy & robustness. All 6 must be implemented.", latencyMs: 2600, inputTokens: 870, outputTokens: 520, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 5, prompt: "Check if model version 3.0.1 of Fraud Detection Engine has drift alert", response: "Fraud Detection v3.0.1: Drift alert ACTIVE. Accuracy 0.91. KL divergence score 0.09 (threshold: 0.08). Escalated to risk officer.", latencyMs: 1800, inputTokens: 590, outputTokens: 350, toxicityScore: 0.02, accuracyScore: 0.89, biasScore: 0.03, flagged: true, flagReason: "Model drift exceeds threshold", isHallucination: false, isPolicyViolation: false },
      { daysAgo: 5, prompt: "Generate ISO 42005 impact assessment summary for Credit Risk Scorer", response: "ISO 42005 impact: 9/9 dimensions documented. Accountability: Defined. Transparency: Partial. Fairness: Under review. Overall assessment: PARTIAL compliance.", latencyMs: 3300, inputTokens: 1100, outputTokens: 750, toxicityScore: 0.01, accuracyScore: 0.94, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 4 ago
      { daysAgo: 4, prompt: "List all AI models processing PII data without encryption", response: "PII processing models: Credit Risk Scorer, Customer Churn Predictor, Employee Sentiment Analyzer (deprecated). Encryption status: All use AES-256. No gaps found.", latencyMs: 1600, inputTokens: 530, outputTokens: 310, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 4, prompt: "Identify training data bias sources in Credit Risk Scorer", response: "Training data bias analysis: Age bias (p=0.04, significant). Gender parity score 0.79. Geographic bias in loan approval rates. Recommend stratified resampling.", latencyMs: 4500, inputTokens: 1420, outputTokens: 940, toxicityScore: 0.02, accuracyScore: 0.86, biasScore: 0.07, flagged: true, flagReason: "Significant bias detected in analysis", isHallucination: false, isPolicyViolation: false },

      // Day 3 ago
      { daysAgo: 3, prompt: "Check regulatory change impact: RBI AI governance circular March 2026", response: "RBI AI circular impacts: Credit Risk Scorer requires enhanced explainability documentation by June 2026. Fraud Detection Engine needs quarterly stress testing.", latencyMs: 2800, inputTokens: 940, outputTokens: 580, toxicityScore: 0.01, accuracyScore: 0.95, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 3, prompt: "Generate weekly monitoring report for AI models", response: "Weekly report: 247 total inferences. 3 flagged interactions (1.2%). Avg latency 2.3s. No policy violations this week. 1 bias alert pending review.", latencyMs: 2100, inputTokens: 710, outputTokens: 430, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 3, prompt: "Validate model output for regulatory document classification", response: "Output validation: Document classified as HIGH RISK per EU AI Act. Classification confidence: 0.94. Human review triggered as per policy.", latencyMs: 1900, inputTokens: 640, outputTokens: 390, toxicityScore: 0.01, accuracyScore: 0.94, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 2 ago
      { daysAgo: 2, prompt: "Summarize all open compliance gaps requiring board attention", response: "Board-level gaps: 1) Fraud Detection incident response plan missing 2) Customer Churn missing full consent records 3) Sentiment Analyzer retired without formal closure.", latencyMs: 2400, inputTokens: 800, outputTokens: 470, toxicityScore: 0.01, accuracyScore: 0.96, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },
      { daysAgo: 2, prompt: "Assess human oversight adequacy for all production AI models", response: "Human oversight assessment: Credit Risk Scorer — adequate. Fraud Detection — adequate. Churn Predictor — under review. NLP Classifier — adequate. Overall: 3/4 production models compliant.", latencyMs: 2700, inputTokens: 900, outputTokens: 560, toxicityScore: 0.01, accuracyScore: 0.95, biasScore: 0.02, flagged: false, isHallucination: false, isPolicyViolation: false },

      // Day 1 ago
      { daysAgo: 1, prompt: "Detect policy violations in recent AI outputs", response: "Policy scan complete: 0 violations in last 24 hours. 1 near-miss detected (toxicity 0.18). Monitoring continues.", latencyMs: 1400, inputTokens: 470, outputTokens: 280, toxicityScore: 0.18, accuracyScore: 0.92, biasScore: 0.03, flagged: true, flagReason: "Near-miss toxicity score requires review", isHallucination: false, isPolicyViolation: false },
      { daysAgo: 1, prompt: "Check if reassessment is required for any AI model", response: "Reassessment required: Fraud Detection Engine (drift detected), Customer Churn Predictor (under review). Schedule within 30 days per policy.", latencyMs: 1600, inputTokens: 540, outputTokens: 320, toxicityScore: 0.01, accuracyScore: 0.97, biasScore: 0.01, flagged: false, isHallucination: false, isPolicyViolation: false },
    ];

    // Build the data array
    const logs = logTemplates.map((t, i) => {
      const model = models[i % models.length];
      const user  = users[i % users.length];
      const agent = agents.length > 0 ? agents[i % agents.length] : null;
      const createdAt = new Date(now - t.daysAgo * DAY + (i % 3) * 3600000); // stagger within day

      return {
        modelId: model.id,
        userId: user.id,
        agentId: agent?.id ?? undefined,
        prompt: t.prompt,
        response: t.response,
        latencyMs: t.latencyMs,
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        toxicityScore: t.toxicityScore,
        accuracyScore: t.accuracyScore,
        biasScore: t.biasScore,
        flagged: t.flagged,
        flagReason: t.flagged ? (t as { flagReason?: string }).flagReason : undefined,
        isHallucination: t.isHallucination,
        isPolicyViolation: t.isPolicyViolation,
        environment: "production",
        createdAt,
      };
    });

    const result = await prisma.promptLog.createMany({ data: logs });

    return NextResponse.json({
      success: true,
      message: "Monitoring seed data inserted successfully",
      created: result.count,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
