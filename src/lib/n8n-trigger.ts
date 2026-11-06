import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { safePostJson } from "@/lib/outbound-http";
import type { N8nTriggerEvent } from "@/types";

type StoredResponse = { status: number | null; snippet: string };

function templateOf(wh: { payloadTemplate: unknown }): Record<string, unknown> {
  return typeof wh.payloadTemplate === "object" && wh.payloadTemplate !== null && !Array.isArray(wh.payloadTemplate)
    ? (wh.payloadTemplate as Record<string, unknown>)
    : {};
}

async function deliver(
  wh: { id: string; webhookUrl: string },
  payload: Record<string, unknown>
): Promise<{ lastStatus: string; lastResponse: StoredResponse }> {
  // safePostJson refuses non-https and private/internal targets, does not
  // follow redirects, and keeps only a short snippet of the reply.
  const res = await safePostJson(wh.webhookUrl, payload);
  const lastStatus = res.ok ? "success" : "error";
  const lastResponse: StoredResponse = { status: res.status, snippet: res.snippet };
  await prisma.n8nWebhook.update({
    where: { id: wh.id },
    data: { lastTriggeredAt: new Date(), lastStatus, lastResponse: lastResponse as Prisma.InputJsonValue },
  });
  return { lastStatus, lastResponse };
}

export async function fireWebhooks(
  projectId: string,
  event: N8nTriggerEvent,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const milestoneId = typeof context.milestoneId === "string" ? context.milestoneId : undefined;
    const webhooks = await prisma.n8nWebhook.findMany({
      where: {
        projectId,
        triggerEvent: event,
        isActive: true,
        // A webhook pinned to one milestone fires only for that milestone.
        ...(event === "MILESTONE_REACHED" && { OR: [{ milestoneId: null }, { milestoneId }] }),
      },
      include: { project: { select: { name: true } } },
    });
    if (webhooks.length === 0) return;

    await Promise.allSettled(
      webhooks.map((wh) =>
        deliver(wh, {
          // Template first, so it can add fields but never override the event data.
          ...templateOf(wh),
          ...context,
          event,
          projectId,
          projectName: wh.project.name,
          timestamp: new Date().toISOString(),
        })
      )
    );
  } catch {
    // Non-blocking
  }
}

/** Send a test event for one webhook. The caller must already have checked it belongs to `projectId`. */
export async function fireWebhookById(
  webhookId: string,
  projectId: string
): Promise<{ lastStatus: string; lastResponse: StoredResponse } | null> {
  const wh = await prisma.n8nWebhook.findFirst({
    where: { id: webhookId, projectId },
    include: { project: { select: { name: true } } },
  });
  if (!wh) return null;

  return deliver(wh, {
    ...templateOf(wh),
    event: wh.triggerEvent,
    projectId: wh.projectId,
    projectName: wh.project.name,
    timestamp: new Date().toISOString(),
    test: true,
  });
}
