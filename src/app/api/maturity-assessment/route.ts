import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest } from "@/lib/api-response";
import { logAudit } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CreateSchema = z.object({
  // Core
  organizationProfile: z.string().min(20),
  industry: z.string().min(2),

  // Step 1: Business Context
  primaryObjective: z.string().default(""),           // Revenue Increase / Cost Reduction / Risk Mitigation / CX Improvement
  targetKPI: z.string().default(""),                  // e.g. "Reduce loan approval time"
  kpiBaseline: z.string().default(""),               // current value e.g. "5 days"
  kpiTarget: z.string().default(""),                  // target value e.g. "1 day"
  timeHorizon: z.string().default("3-6 months"),

  // Step 2: Process & Decisions
  valueChainStage: z.string().default(""),           // Acquisition/Onboarding/Operations/Support/Retention
  painPoints: z.array(z.string()).default([]),        // High manual effort, Low conversion, etc.
  processType: z.string().default(""),               // Manual/Rule-based/Semi-automated
  keyDecisions: z.array(z.string()).default([]),      // Pricing/Approval/Recommendation/Routing/Forecasting
  decisionFrequency: z.string().default(""),
  isDecisionSubjective: z.boolean().default(false),

  // Step 3: Data Readiness
  dataAvailability: z.array(z.string()).default([]), // Structured/Unstructured/Behavioral
  dataVolume: z.string().default(""),               // Low/Medium/High (>1M)
  dataQuality: z.string().default(""),              // Poor/Moderate/High
  dataFreshness: z.string().default(""),            // Batch/Near real-time/Real-time
  dataAccess: z.string().default(""),               // Siloed/Partially integrated/Fully accessible
  dataSources: z.array(z.string()).default([]),

  // Step 4: Customer & Monetization
  customerTouchpoints: z.array(z.string()).default([]),
  journeyStage: z.string().default(""),
  personalizationRequired: z.boolean().default(false),
  revenueLevers: z.array(z.string()).default([]),    // Upsell/Cross-sell/Pricing optimization/New product
  estimatedRevenueImpact: z.string().default(""),   // e.g. "15%"
  estimatedCostSaving: z.string().default(""),      // e.g. "30%"
  transactionVolume: z.string().default(""),        // e.g. "50,000/month"

  // Step 5: Technology, Governance & Org
  existingSystems: z.array(z.string()).default([]),
  integrationComplexity: z.string().default(""),    // Low/Medium/High
  cloudReadiness: z.string().default(""),            // On-prem/Hybrid/Cloud-native
  regulatoryImpact: z.string().default(""),          // None/Moderate/High (DPDP/GDPR/HIPAA)
  explainabilityRequired: z.boolean().default(false),
  biasRisk: z.string().default(""),                 // Low/Medium/High
  skillAvailability: z.array(z.string()).default([]), // Data Science/Data Engineering/MLOps
  changeImpact: z.string().default(""),              // Low/Medium/High
  industryMetrics: z.record(z.string()).default({}), // industry-specific KPIs

  // Legacy compatibility
  functions: z.array(z.string()).default([]),
  maturityScore: z.number().int().min(1).max(5).default(2),
  businessGoals: z.array(z.string()).default([]),
});

// ── Build the Claude prompt ───────────────────────────────────────────────────
function buildPrompt(data: z.infer<typeof CreateSchema>): string {
  return `You are a Principal AI Strategy Consultant specialising in enterprise AI transformation.

Your task: Analyse the detailed discovery data below and generate ONE highest-impact, production-ready AI use case. The output must be HYPER-SPECIFIC — reference exact KPI numbers, specific pain points, named systems, and industry terminology. NEVER produce generic output like "improve efficiency" — always say "reduce loan approval time from ${data.kpiBaseline || "current"} to ${data.kpiTarget || "target"}".

CRITICAL RULES:
- Return STRICT VALID JSON only — no markdown, no code fences
- Generate EXACTLY 1 use case (the single highest-priority one after scoring)
- Reference EXACT metrics from the input in every section
- Use industry-specific terminology appropriate for ${data.industry}
- Every node in n8n_workflow must be a real n8n node type

===== DISCOVERY DATA =====

## ORGANIZATION PROFILE
${data.organizationProfile}
Industry: ${data.industry}
Business Functions: ${data.functions.length > 0 ? data.functions.join(", ") : "Not specified"}

## BUSINESS CONTEXT
Primary Objective: ${data.primaryObjective || "Not specified"}
Target KPI: ${data.targetKPI || "Not specified"}
Current Baseline: ${data.kpiBaseline || "Not specified"}
Target Value: ${data.kpiTarget || "Not specified"}
Time Horizon: ${data.timeHorizon}
Business Goals: ${data.businessGoals.length > 0 ? data.businessGoals.join("; ") : "Not specified"}

## PROCESS & DECISION INTELLIGENCE
Value Chain Stage: ${data.valueChainStage || "Not specified"}
Process Name/Type: ${data.processType || "Not specified"}
Current Pain Points: ${data.painPoints.length > 0 ? data.painPoints.join(", ") : "Not specified"}
Key Decisions Involved: ${data.keyDecisions.length > 0 ? data.keyDecisions.join(", ") : "Not specified"}
Decision Frequency: ${data.decisionFrequency || "Not specified"}
Decision is Subjective: ${data.isDecisionSubjective ? "Yes — human judgment is currently involved" : "No"}

## DATA READINESS
Data Availability Types: ${data.dataAvailability.length > 0 ? data.dataAvailability.join(", ") : "Not specified"}
Data Volume: ${data.dataVolume || "Not specified"}
Data Quality: ${data.dataQuality || "Not specified"}
Data Freshness: ${data.dataFreshness || "Not specified"}
Data Access Level: ${data.dataAccess || "Not specified"}
Known Data Sources: ${data.dataSources.length > 0 ? data.dataSources.join(", ") : "Infer from industry"}

## CUSTOMER & MONETIZATION
Customer Touchpoints: ${data.customerTouchpoints.length > 0 ? data.customerTouchpoints.join(", ") : "Not specified"}
Customer Journey Stage: ${data.journeyStage || "Not specified"}
Personalization Required: ${data.personalizationRequired ? "Yes" : "No"}
Revenue Levers: ${data.revenueLevers.length > 0 ? data.revenueLevers.join(", ") : "Not specified"}
Estimated Revenue Impact: ${data.estimatedRevenueImpact ? data.estimatedRevenueImpact + "%" : "Not specified"}
Estimated Cost Saving: ${data.estimatedCostSaving ? data.estimatedCostSaving + "%" : "Not specified"}
Monthly Transaction Volume: ${data.transactionVolume || "Not specified"}

## TECHNOLOGY READINESS
Existing Systems: ${data.existingSystems.length > 0 ? data.existingSystems.join(", ") : "Not specified"}
Integration Complexity: ${data.integrationComplexity || "Not specified"}
Cloud Readiness: ${data.cloudReadiness || "Not specified"}

## GOVERNANCE & RISK
Regulatory Impact: ${data.regulatoryImpact || "None specified"}
Explainability Required: ${data.explainabilityRequired ? "Yes — model decisions must be auditable" : "No"}
Bias Risk: ${data.biasRisk || "Not assessed"}
Skill Availability: ${data.skillAvailability.length > 0 ? data.skillAvailability.join(", ") : "Not specified"}
Change Management Impact: ${data.changeImpact || "Not specified"}

## INDUSTRY-SPECIFIC METRICS
${
    Object.keys(data.industryMetrics).length > 0
      ? Object.entries(data.industryMetrics).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "No industry-specific metrics provided"
  }

===== SCORING INSTRUCTIONS =====

Before generating the use case, internally compute its Priority Score using this model:

| Dimension | Weight | Score Logic |
|---|---|---|
| Business Impact | 25% | 5=direct revenue >10%, 3=moderate, 1=low/indirect |
| Data Readiness | 20% | 5=high quality+real-time+integrated, 3=moderate, 1=poor/siloed |
| Decision Complexity | 15% | 5=high-frequency+subjective, 3=moderate, 1=simple |
| Monetization Potential | 15% | 5=direct revenue generation, 3=cost optimization, 1=soft benefits |
| Tech Feasibility | 10% | 5=easily integrable, 3=moderate, 1=high complexity |
| Risk & Compliance (reverse) | 10% | 5=low risk, 3=moderate, 1=high regulatory risk |
| Org Readiness | 5% | 5=fully ready, 3=partial, 1=not ready |

Final Score = (Impact×0.25 + Data×0.20 + Decision×0.15 + Monetization×0.15 + Tech×0.10 + Risk×0.10 + Org×0.05) × 20
Tier: 80-100=Tier 1 (Immediate), 60-79=Tier 2 (Pilot/MVP), 40-59=Tier 3 (Backlog), <40=Reject

===== ALLOWED n8n NODE TYPES =====
Triggers: n8n-nodes-base.webhook | n8n-nodes-base.scheduleTrigger | n8n-nodes-base.manualTrigger
HTTP/API: n8n-nodes-base.httpRequest
Logic: n8n-nodes-base.if | n8n-nodes-base.switch | n8n-nodes-base.merge | n8n-nodes-base.splitInBatches | n8n-nodes-base.filter
Data: n8n-nodes-base.set | n8n-nodes-base.code | n8n-nodes-base.itemLists
AI/LLM: @n8n/n8n-nodes-langchain.agent | @n8n/n8n-nodes-langchain.chainLlm | @n8n/n8n-nodes-langchain.lmChatAnthropic | @n8n/n8n-nodes-langchain.lmChatOpenAi
Database: n8n-nodes-base.postgres | n8n-nodes-base.mySql | n8n-nodes-base.mongoDb | n8n-nodes-base.redis
Communication: n8n-nodes-base.emailSend | n8n-nodes-base.slack | n8n-nodes-base.microsoftTeams | n8n-nodes-base.twilio
CRM: n8n-nodes-base.salesforce | n8n-nodes-base.hubspot | n8n-nodes-base.airtable
Utility: n8n-nodes-base.wait | n8n-nodes-base.respondToWebhook | n8n-nodes-base.noOp

===== OUTPUT FORMAT =====
Return ONLY this JSON (no markdown):

{
  "use_cases": [
    {
      "use_case_name": "SPECIFIC name referencing the actual process and industry (e.g. 'AI-Powered Loan Underwriting Acceleration — XGBoost + n8n Pipeline')",
      "priority_score": 78,
      "priority_tier": "Tier 2 (Pilot/MVP)",
      "score_breakdown": {
        "business_impact": 4,
        "data_readiness": 3,
        "decision_complexity": 4,
        "monetization": 4,
        "tech_feasibility": 3,
        "risk_compliance": 4,
        "org_readiness": 3,
        "rationale": "One sentence explaining the score"
      },
      "business_problem": "Specific problem with exact numbers from input",
      "ai_solution": "Specific AI solution naming the exact algorithms and integrations",
      "expected_business_impact": "Quantified impact referencing baseline→target KPI from input",
      "agentic_ai_design": {
        "agents": [
          {
            "agent_name": "Specific Agent Name",
            "role": "Specific role in this workflow",
            "responsibilities": ["specific task 1", "specific task 2"]
          }
        ],
        "decision_flow": "Step-by-step decision flow specific to this use case"
      },
      "n8n_workflow": {
        "workflow_name": "Specific workflow name",
        "trigger": "How this workflow is triggered",
        "nodes": [
          {
            "step": 1,
            "name": "Node Display Name",
            "node_type": "n8n-nodes-base.webhook",
            "description": "What this node does",
            "parameters": { "key": "value" }
          }
        ],
        "connections": [
          { "from": "Node A Name", "to": "Node B Name" }
        ],
        "integrations": ["list of systems integrated"],
        "workflow_summary": "One paragraph summary"
      },
      "implementation_plan": {
        "timeline_weeks": "X weeks",
        "phases": [
          {
            "phase_name": "Phase name",
            "duration": "X weeks",
            "activities": ["specific activity 1", "specific activity 2"]
          }
        ]
      },
      "integration_architecture": {
        "systems_involved": ["System A", "System B"],
        "data_flow": "Specific data flow description",
        "api_requirements": ["API endpoint 1", "API endpoint 2"]
      }
    }
  ]
}`;
}

// ── GET /api/maturity-assessment — list all assessments for org ───────────────
export const GET = withAuth(async (_req, { organizationId }) => {
  try {
    const assessments = await prisma.maturityAssessment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        industry: true,
        maturityScore: true,
        status: true,
        createdAt: true,
        organizationProfile: true,
        functions: true,
        businessGoals: true,
      },
    });
    return ok(assessments);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[maturity-assessment GET]", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});

// ── POST /api/maturity-assessment — run new assessment ────────────────────────
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid input");

    const data = parsed.data;

    // Check Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY is not configured on the server" }, { status: 500 });

    // Create assessment record in PROCESSING state
    const assessment = await prisma.maturityAssessment.create({
      data: {
        organizationId,
        organizationProfile: data.organizationProfile,
        industry: data.industry,
        functions: data.functions,
        maturityScore: data.maturityScore,
        dataSources: data.dataSources,
        existingSystems: data.existingSystems,
        businessGoals: data.businessGoals,
        status: "PROCESSING",
      },
    });

    // Call Claude API
    try {
      const anthropic = new Anthropic({ apiKey });
      const prompt = buildPrompt(data);

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      // Parse the JSON response from Claude — strip markdown fences if present
      let useCases: unknown;
      try {
        // Remove markdown code fences if Claude wrapped the JSON
        const stripped = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
        const start = stripped.indexOf("{");
        const end = stripped.lastIndexOf("}");
        if (start === -1 || end === -1 || end <= start) {
          throw new Error(`PARSE_FAIL|rawLen=${rawText.length}|preview=${rawText.slice(0, 300)}`);
        }
        const jsonStr = stripped.slice(start, end + 1);
        const parsedJson = JSON.parse(jsonStr);
        useCases = parsedJson.use_cases ?? parsedJson;
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        throw new Error(`Claude JSON parse error: ${msg}`);
      }

      // Save result
      const updated = await prisma.maturityAssessment.update({
        where: { id: assessment.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { useCases: useCases as any, status: "COMPLETED" },
      });

      await logAudit({
        userId: user.userId,
        organizationId,
        action: "AI_MATURITY_ASSESSMENT_COMPLETED",
        resource: "maturity_assessment",
        resourceId: assessment.id,
        metadata: { industry: data.industry, maturityScore: data.maturityScore, useCaseCount: Array.isArray(useCases) ? useCases.length : 0 },
      });

      return created({ id: updated.id, status: updated.status, useCases });

    } catch (aiErr) {
      // Mark assessment as failed
      await prisma.maturityAssessment.update({
        where: { id: assessment.id },
        data: {
          status: "FAILED",
          errorMessage: aiErr instanceof Error ? aiErr.message : "AI generation failed",
        },
      });
      throw aiErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[maturity-assessment POST]", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});
