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
  organizationProfile: z.string().min(20, "Provide at least 20 characters describing the organization"),
  industry: z.string().min(2),
  functions: z.array(z.string()).min(1, "Select at least one business function"),
  maturityScore: z.number().int().min(1).max(5),
  dataSources: z.array(z.string()).default([]),
  existingSystems: z.array(z.string()).default([]),
  businessGoals: z.array(z.string()).min(1, "Provide at least one business goal"),
});

// ── Build the Claude prompt ───────────────────────────────────────────────────
function buildPrompt(data: z.infer<typeof CreateSchema>): string {
  const maturityLabels: Record<number, string> = {
    1: "Level 1 — Ad Hoc (No formal AI processes, experimental only)",
    2: "Level 2 — Developing (Some pilots running, no governance framework)",
    3: "Level 3 — Defined (AI governance policies exist, limited enforcement)",
    4: "Level 4 — Managed (Metrics-driven, AI models tracked and monitored)",
    5: "Level 5 — Optimized (AI-first organization, continuous improvement)",
  };

  return `You are an Enterprise AI Architect and Agentic AI Solution Designer specialising in n8n workflow automation.

Your task is to analyze the organization's AI maturity assessment and generate HIGH-IMPACT, IMPLEMENTABLE AI recommendations with REAL n8n workflow definitions.

CRITICAL RULES:
- Generate EXACTLY 1 use case (the single highest-impact one for this organization)
- Return STRICT VALID JSON only — no markdown, no code fences, no text outside the JSON
- For n8n_workflow.nodes, use ONLY real n8n node types from the allowed list below
- Every node must have: step, node_type (exact n8n type string), name (display name), description, and parameters (key config values as object)
- Nodes must be connected sequentially — the output of step N feeds into step N+1
- If data is missing, infer reasonably from the industry context

ALLOWED n8n NODE TYPES (use exact strings):
Triggers: n8n-nodes-base.webhook | n8n-nodes-base.scheduleTrigger | n8n-nodes-base.manualTrigger
HTTP/API: n8n-nodes-base.httpRequest
Logic: n8n-nodes-base.if | n8n-nodes-base.switch | n8n-nodes-base.merge | n8n-nodes-base.splitInBatches | n8n-nodes-base.filter
Data: n8n-nodes-base.set | n8n-nodes-base.code | n8n-nodes-base.itemLists
AI/LLM: @n8n/n8n-nodes-langchain.agent | @n8n/n8n-nodes-langchain.chainLlm | @n8n/n8n-nodes-langchain.lmChatAnthropic | @n8n/n8n-nodes-langchain.lmChatOpenAi | @n8n/n8n-nodes-langchain.openAi | @n8n/n8n-nodes-langchain.embeddingsOpenAi | @n8n/n8n-nodes-langchain.vectorStoreInMemory | @n8n/n8n-nodes-langchain.toolWorkflow
Database: n8n-nodes-base.postgres | n8n-nodes-base.mySql | n8n-nodes-base.mongoDb | n8n-nodes-base.redis
Communication: n8n-nodes-base.emailSend | n8n-nodes-base.slack | n8n-nodes-base.microsoftTeams | n8n-nodes-base.twilio
CRM: n8n-nodes-base.salesforce | n8n-nodes-base.hubspot | n8n-nodes-base.airtable
Files: n8n-nodes-base.spreadsheetFile | n8n-nodes-base.awsS3 | n8n-nodes-base.googleDrive | n8n-nodes-base.pdf
Utility: n8n-nodes-base.wait | n8n-nodes-base.respondToWebhook | n8n-nodes-base.noOp

--------------------------------------------------

INPUT:

Organization Profile:
${data.organizationProfile}

Industry:
${data.industry}

Business Functions:
${data.functions.join(", ")}

AI Maturity Level:
${maturityLabels[data.maturityScore] ?? `Level ${data.maturityScore}`}

Data Sources:
${data.dataSources.length > 0 ? data.dataSources.join(", ") : "Not specified — infer from industry context"}

Existing Systems:
${data.existingSystems.length > 0 ? data.existingSystems.join(", ") : "Not specified — infer from industry context"}

Business Goals:
${data.businessGoals.join("; ")}

--------------------------------------------------

OUTPUT FORMAT (return ONLY this JSON):

{
  "use_cases": [
    {
      "use_case_name": "",
      "business_problem": "",
      "ai_solution": "",
      "expected_business_impact": "",

      "agentic_ai_design": {
        "agents": [
          {
            "agent_name": "",
            "role": "",
            "responsibilities": []
          }
        ],
        "decision_flow": ""
      },

      "n8n_workflow": {
        "workflow_name": "",
        "trigger": "",
        "nodes": [
          {
            "step": 1,
            "name": "Trigger Node Display Name",
            "node_type": "n8n-nodes-base.webhook",
            "description": "What this node does in business terms",
            "parameters": {
              "key": "value"
            }
          }
        ],
        "connections": [
          { "from": "Node Display Name A", "to": "Node Display Name B" }
        ],
        "integrations": [],
        "workflow_summary": ""
      },

      "implementation_plan": {
        "timeline_weeks": "",
        "phases": [
          {
            "phase_name": "",
            "duration": "",
            "activities": []
          }
        ]
      },

      "integration_architecture": {
        "systems_involved": [],
        "data_flow": "",
        "api_requirements": []
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
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
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
        const parsed = JSON.parse(jsonStr);
        useCases = parsed.use_cases ?? parsed;
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
