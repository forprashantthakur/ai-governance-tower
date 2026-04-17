import { NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow up to 60s for Claude API call

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

  return `You are an Enterprise AI Architect and Agentic AI Solution Designer.

Your task is to analyze the organization's AI maturity assessment and generate HIGH-IMPACT, IMPLEMENTABLE AI recommendations.

IMPORTANT:
- Limit output to MAX 3 use cases
- Return STRICT VALID JSON only — no markdown, no code fences, no explanations outside the JSON
- Keep responses concise and structured
- Use realistic, industry-specific language
- n8n_workflow nodes must be concrete and actionable
- If data is missing, infer reasonably based on the industry

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

OUTPUT FORMAT (return ONLY this JSON, no other text):

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
            "node_type": "",
            "description": ""
          }
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
    return serverError(err);
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
    if (!apiKey) return serverError("ANTHROPIC_API_KEY is not configured");

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
        model: "claude-opus-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = message.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      // Parse the JSON response
      let useCases: unknown;
      try {
        // Strip any accidental markdown fences
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```\s*$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        useCases = parsed.use_cases ?? parsed;
      } catch {
        throw new Error(`Claude returned invalid JSON: ${rawText.slice(0, 200)}`);
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
    return serverError(err);
  }
});
