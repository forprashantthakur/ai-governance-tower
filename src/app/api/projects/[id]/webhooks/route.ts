import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateWebhookSchema = z.object({
  name: z.string().min(1),
  webhookUrl: z.string().url("Must be a valid URL"),
  triggerEvent: z.enum(["PHASE_COMPLETE", "MILESTONE_REACHED", "TASK_DONE", "RISK_THRESHOLD", "EXPERIMENT_LOGGED"]),
  milestoneId: z.string().optional(),
  isActive: z.boolean().optional(),
  payloadTemplate: z.record(z.unknown()).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const webhooks = await withRetry(() =>
      prisma.n8nWebhook.findMany({
        where: { projectId: params!.id },
        orderBy: { createdAt: "desc" },
      })
    );
    return ok(webhooks);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const webhook = await withRetry(() =>
      prisma.n8nWebhook.create({
        data: {
          projectId: params!.id,
          name: parsed.data.name,
          webhookUrl: parsed.data.webhookUrl,
          triggerEvent: parsed.data.triggerEvent as never,
          milestoneId: parsed.data.milestoneId,
          isActive: parsed.data.isActive ?? true,
          payloadTemplate: (parsed.data.payloadTemplate ?? {}) as Prisma.InputJsonValue,
        },
      })
    );
    return ok(webhook, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
