/**
 * LLM Observability Middleware
 * Wraps OpenAI calls, logs to PromptLog table, and forwards to Langfuse if configured.
 */

import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LlmCallParams {
  modelId: string;
  agentId?: string;
  userId?: string;
  sessionId?: string;
  prompt: string;
  systemPrompt?: string;
  toolsUsed?: string[];
  maxTokens?: number;
  temperature?: number;
  environment?: string;
}

export interface LlmCallResult {
  response: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  logId: string;
}

export async function callLlmWithLogging(
  params: LlmCallParams
): Promise<LlmCallResult> {
  const start = Date.now();

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (params.systemPrompt) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.prompt });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: params.maxTokens ?? 1000,
    temperature: params.temperature ?? 0.7,
  });

  const latencyMs = Date.now() - start;
  const responseText = completion.choices[0]?.message?.content ?? "";
  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;

  // Persist log
  const log = await prisma.promptLog.create({
    data: {
      modelId: params.modelId,
      agentId: params.agentId,
      userId: params.userId,
      sessionId: params.sessionId,
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      toolsUsed: params.toolsUsed ?? [],
      response: responseText,
      inputTokens,
      outputTokens,
      latencyMs,
      environment: params.environment ?? "production",
    },
  });

  // Forward to Langfuse (if configured)
  if (
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_PUBLIC_KEY
  ) {
    try {
      await sendToLangfuse({
        id: log.id,
        prompt: params.prompt,
        response: responseText,
        model: "gpt-4o",
        inputTokens,
        outputTokens,
        latencyMs,
        userId: params.userId,
      });
    } catch {
      // Non-fatal
    }
  }

  return {
    response: responseText,
    inputTokens,
    outputTokens,
    latencyMs,
    logId: log.id,
  };
}

async function sendToLangfuse(data: {
  id: string;
  prompt: string;
  response: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  userId?: string;
}): Promise<void> {
  const host = process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";
  await fetch(`${host}/api/public/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(
        `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
      ).toString("base64")}`,
    },
    body: JSON.stringify({
      id: data.id,
      name: "ai-governance-llm-call",
      model: data.model,
      prompt: { role: "user", content: data.prompt },
      completion: data.response,
      usage: {
        promptTokens: data.inputTokens,
        completionTokens: data.outputTokens,
      },
      metadata: { latencyMs: data.latencyMs, userId: data.userId },
    }),
  });
}
