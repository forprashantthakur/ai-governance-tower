import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Correct typeVersions for n8n 1.x — critical for import compatibility
const TYPE_VERSIONS: Record<string, number> = {
  "n8n-nodes-base.manualTrigger":           1,
  "n8n-nodes-base.webhook":                 2,
  "n8n-nodes-base.scheduleTrigger":         1,
  "n8n-nodes-base.httpRequest":             4,
  "n8n-nodes-base.if":                      2,
  "n8n-nodes-base.switch":                  3,
  "n8n-nodes-base.set":                     3,
  "n8n-nodes-base.code":                    2,
  "n8n-nodes-base.merge":                   3,
  "n8n-nodes-base.filter":                  1,
  "n8n-nodes-base.splitInBatches":          3,
  "n8n-nodes-base.emailSend":               2,
  "n8n-nodes-base.slack":                   2,
  "n8n-nodes-base.microsoftTeams":          2,
  "n8n-nodes-base.twilio":                  1,
  "n8n-nodes-base.postgres":                2,
  "n8n-nodes-base.mySql":                   2,
  "n8n-nodes-base.mongoDb":                 1,
  "n8n-nodes-base.redis":                   1,
  "n8n-nodes-base.salesforce":              1,
  "n8n-nodes-base.hubspot":                 2,
  "n8n-nodes-base.airtable":               3,
  "n8n-nodes-base.spreadsheetFile":         2,
  "n8n-nodes-base.awsS3":                  1,
  "n8n-nodes-base.googleDrive":             3,
  "n8n-nodes-base.pdf":                     1,
  "n8n-nodes-base.wait":                    1,
  "n8n-nodes-base.respondToWebhook":        1,
  "n8n-nodes-base.noOp":                    1,
  "n8n-nodes-base.itemLists":               3,
  "@n8n/n8n-nodes-langchain.agent":         1,
  "@n8n/n8n-nodes-langchain.chainLlm":      1,
  "@n8n/n8n-nodes-langchain.lmChatAnthropic": 1,
  "@n8n/n8n-nodes-langchain.lmChatOpenAi":  1,
  "@n8n/n8n-nodes-langchain.openAi":        1,
  "@n8n/n8n-nodes-langchain.embeddingsOpenAi": 1,
  "@n8n/n8n-nodes-langchain.vectorStoreInMemory": 1,
  "@n8n/n8n-nodes-langchain.toolWorkflow":  1,
};

const Schema = z.object({
  description:  z.string().min(20, "Describe the workflow in at least 20 characters"),
  triggerType:  z.enum(["webhook", "schedule", "manual"]).default("webhook"),
  integrations: z.array(z.string()).default([]),
  complexity:   z.enum(["simple", "medium", "complex"]).default("medium"),
});

function buildPrompt(data: z.infer<typeof Schema>): string {
  const triggerNode: Record<string, string> = {
    webhook:  "n8n-nodes-base.webhook",
    schedule: "n8n-nodes-base.scheduleTrigger",
    manual:   "n8n-nodes-base.manualTrigger",
  };

  const nodeCount = data.complexity === "simple" ? "4-6" : data.complexity === "medium" ? "6-10" : "10-14";

  return `You are an expert n8n workflow engineer. Generate a PRODUCTION-READY n8n workflow.

TASK: ${data.description}
TRIGGER: ${data.triggerType} (use node type: ${triggerNode[data.triggerType]})
INTEGRATIONS REQUESTED: ${data.integrations.length > 0 ? data.integrations.join(", ") : "infer from task"}
COMPLEXITY: ${data.complexity} (aim for ${nodeCount} nodes)

CRITICAL RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Use ONLY these exact node type strings:
   Triggers: n8n-nodes-base.webhook | n8n-nodes-base.scheduleTrigger | n8n-nodes-base.manualTrigger
   HTTP/API: n8n-nodes-base.httpRequest
   Logic: n8n-nodes-base.if | n8n-nodes-base.switch | n8n-nodes-base.merge | n8n-nodes-base.splitInBatches | n8n-nodes-base.filter
   Data: n8n-nodes-base.set | n8n-nodes-base.code | n8n-nodes-base.itemLists
   AI/LLM: @n8n/n8n-nodes-langchain.agent | @n8n/n8n-nodes-langchain.chainLlm | @n8n/n8n-nodes-langchain.lmChatAnthropic | @n8n/n8n-nodes-langchain.lmChatOpenAi
   Database: n8n-nodes-base.postgres | n8n-nodes-base.mySql | n8n-nodes-base.mongoDb | n8n-nodes-base.redis
   Communication: n8n-nodes-base.emailSend | n8n-nodes-base.slack | n8n-nodes-base.microsoftTeams | n8n-nodes-base.twilio
   CRM: n8n-nodes-base.salesforce | n8n-nodes-base.hubspot | n8n-nodes-base.airtable
   Files: n8n-nodes-base.spreadsheetFile | n8n-nodes-base.awsS3 | n8n-nodes-base.googleDrive | n8n-nodes-base.pdf
   Utility: n8n-nodes-base.wait | n8n-nodes-base.respondToWebhook | n8n-nodes-base.noOp
3. parameters must have REAL, specific values — not placeholders like "your-api-key"
4. Each node must have a unique, descriptive "name" (display name in n8n canvas)
5. connections must reference exact node names

OUTPUT FORMAT — return ONLY this JSON structure:
{
  "workflow_name": "descriptive workflow name",
  "description": "one sentence describing what this workflow does",
  "category": "one of: AI Automation | Data Pipeline | Alert & Notification | CRM Integration | Compliance | API Integration | Document Processing",
  "estimated_run_time": "e.g. 2-5 seconds per execution",
  "nodes": [
    {
      "id": "node_1",
      "name": "Receive Webhook",
      "type": "n8n-nodes-base.webhook",
      "category": "trigger",
      "description": "Receives incoming HTTP POST requests",
      "parameters": {
        "httpMethod": "POST",
        "path": "/governance-trigger",
        "responseMode": "responseNode"
      },
      "credentials_needed": []
    }
  ],
  "connections": [
    { "from": "Receive Webhook", "to": "Parse Request Data" }
  ],
  "credentials_required": ["list of credentials needed e.g. Slack API, PostgreSQL"],
  "setup_steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "test_instructions": "How to test this workflow once imported"
}`;
}

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? "Invalid input");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 6000,
    messages: [{ role: "user", content: buildPrompt(parsed.data) }],
  });

  const rawText = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Strip markdown fences and extract JSON
  const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return NextResponse.json({ success: false, error: "AI did not return valid JSON" }, { status: 500 });
  }

  const aiResult = JSON.parse(stripped.slice(start, end + 1));

  // Build production-ready n8n import JSON
  const NODE_W = 240;
  const NODE_H = 100;
  const X_START = 240;
  const Y_CENTER = 300;

  const n8nNodes = (aiResult.nodes ?? []).map((node: {
    id: string; name: string; type: string; parameters?: Record<string, unknown>; description?: string;
  }, i: number) => ({
    id: node.id ?? `node_${i + 1}`,
    name: node.name,
    type: node.type,
    typeVersion: TYPE_VERSIONS[node.type] ?? 1,
    position: [X_START + i * (NODE_W + 60), Y_CENTER],
    parameters: node.parameters ?? {},
    notes: node.description ?? "",
    disabled: false,
  }));

  // Build connections in n8n format
  const connectionsMap: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};

  if (aiResult.connections?.length > 0) {
    for (const conn of aiResult.connections) {
      if (!connectionsMap[conn.from]) {
        connectionsMap[conn.from] = { main: [[]] };
      }
      connectionsMap[conn.from].main[0].push({ node: conn.to, type: "main", index: 0 });
    }
  } else {
    // Sequential fallback
    n8nNodes.slice(0, -1).forEach((n: { name: string }, i: number) => {
      connectionsMap[n.name] = { main: [[{ node: n8nNodes[i + 1].name, type: "main", index: 0 }]] };
    });
  }

  const n8nExport = {
    name: aiResult.workflow_name ?? "AI Generated Workflow",
    nodes: n8nNodes,
    connections: connectionsMap,
    active: false,
    settings: {
      executionOrder: "v1",
      saveManualExecutions: true,
      callerPolicy: "workflowsFromSameOwner",
      errorWorkflow: "",
    },
    meta: {
      instanceId: "ai-governance-tower",
      templateCredsSetupCompleted: false,
    },
    tags: [],
  };

  return ok({
    ...aiResult,
    n8n_export: n8nExport,
  });
});
