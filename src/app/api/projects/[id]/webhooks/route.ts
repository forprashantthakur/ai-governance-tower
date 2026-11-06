import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { findProjectInOrg } from "@/lib/tenant";
import { assertPublicHttpsUrl, UnsafeUrlError } from "@/lib/outbound-http";

export const dynamic = "force-dynamic";

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(200),
  webhookUrl: z.string().url("Must be a valid URL").max(2048),
  triggerEvent: z.enum(["PHASE_COMPLETE", "MILESTONE_REACHED", "TASK_DONE", "RISK_THRESHOLD", "EXPERIMENT_LOGGED"]),
  milestoneId: z.string().optional(),
  isActive: z.boolean().optional(),
  payloadTemplate: z.record(z.unknown()).optional(),
});

const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

/** Webhook URLs act as bearer secrets for n8n; only admins see them in full. */
function redactWebhook<T extends { webhookUrl: string; payloadTemplate?: unknown; lastResponse?: unknown }>(
  wh: T,
  isAdmin: boolean
) {
  if (isAdmin) return wh;
  let masked = "(hidden)";
  try {
    masked = `${new URL(wh.webhookUrl).origin}/…`;
  } catch {
    /* keep placeholder */
  }
  return { ...wh, webhookUrl: masked, payloadTemplate: undefined, lastResponse: undefined };
}

export const GET = withAuth(async (_req: NextRequest, { params, user, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const webhooks = await withRetry(() =>
      prisma.n8nWebhook.findMany({
        where: { projectId: params!.id },
        orderBy: { createdAt: "desc" },
      })
    );
    const isAdmin = ADMIN_ROLES.has(user.orgRole);
    return ok(webhooks.map((wh) => redactWebhook(wh, isAdmin)));
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const body = await req.json();
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    try {
      await assertPublicHttpsUrl(parsed.data.webhookUrl);
    } catch (err) {
      if (err instanceof UnsafeUrlError) return badRequest(err.message);
      throw err;
    }
    if (parsed.data.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: parsed.data.milestoneId, projectId: params!.id },
        select: { id: true },
      });
      if (!milestone) return badRequest("Milestone not found in this project");
    }

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
}, "ADMIN");
