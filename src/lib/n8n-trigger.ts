import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { N8nTriggerEvent } from "@/types";

export async function fireWebhooks(
  projectId: string,
  event: N8nTriggerEvent,
  context: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await prisma.n8nWebhook.findMany({
      where: { projectId, triggerEvent: event, isActive: true },
      include: { project: { select: { name: true } } },
    });
    if (webhooks.length === 0) return;

    await Promise.allSettled(
      webhooks.map(async (wh) => {
        const payload = {
          event,
          projectId,
          projectName: wh.project.name,
          timestamp: new Date().toISOString(),
          ...context,
          ...(typeof wh.payloadTemplate === "object" && wh.payloadTemplate !== null
            ? (wh.payloadTemplate as Record<string, unknown>)
            : {}),
        };

        let lastStatus = "error";
        let lastResponse: unknown = null;

        try {
          const res = await fetch(wh.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
          });
          const body = await res.text();
          lastStatus = res.ok ? "success" : "error";
          lastResponse = { status: res.status, body };
        } catch (err) {
          lastResponse = { error: String(err) };
        }

        await prisma.n8nWebhook.update({
          where: { id: wh.id },
          data: { lastTriggeredAt: new Date(), lastStatus, lastResponse: lastResponse as Prisma.InputJsonValue },
        });
      })
    );
  } catch {
    // Non-blocking
  }
}

export async function fireWebhookById(
  webhookId: string
): Promise<{ lastStatus: string; lastResponse: unknown }> {
  const wh = await prisma.n8nWebhook.findUniqueOrThrow({
    where: { id: webhookId },
    include: { project: { select: { name: true } } },
  });

  const payload = {
    event: wh.triggerEvent,
    projectId: wh.projectId,
    projectName: wh.project.name,
    timestamp: new Date().toISOString(),
    test: true,
    ...(typeof wh.payloadTemplate === "object" && wh.payloadTemplate !== null
      ? (wh.payloadTemplate as Record<string, unknown>)
      : {}),
  };

  let lastStatus = "error";
  let lastResponse: unknown = null;

  try {
    const res = await fetch(wh.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.text();
    lastStatus = res.ok ? "success" : "error";
    lastResponse = { status: res.status, body };
  } catch (err) {
    lastResponse = { error: String(err) };
  }

  await prisma.n8nWebhook.update({
    where: { id: webhookId },
    data: { lastTriggeredAt: new Date(), lastStatus, lastResponse: lastResponse as Prisma.InputJsonValue },
  });

  return { lastStatus, lastResponse };
}
