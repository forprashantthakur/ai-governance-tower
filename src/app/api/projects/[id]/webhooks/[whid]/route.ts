import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { findProjectInOrg } from "@/lib/tenant";
import { assertPublicHttpsUrl, UnsafeUrlError } from "@/lib/outbound-http";

export const dynamic = "force-dynamic";

const UpdateWebhookSchema = z.object({
  name: z.string().max(200).optional(),
  webhookUrl: z.string().url().max(2048).optional(),
  isActive: z.boolean().optional(),
  payloadTemplate: z.record(z.unknown()).optional(),
});

async function findWebhook(projectId: string, webhookId: string, organizationId: string) {
  if (!(await findProjectInOrg(projectId, organizationId))) return null;
  return prisma.n8nWebhook.findFirst({ where: { id: webhookId, projectId }, select: { id: true } });
}

export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await findWebhook(params!.id, params!.whid, organizationId);
    if (!existing) return notFound("Webhook");

    const body = await req.json();
    const parsed = UpdateWebhookSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    if (parsed.data.webhookUrl) {
      try {
        await assertPublicHttpsUrl(parsed.data.webhookUrl);
      } catch (err) {
        if (err instanceof UnsafeUrlError) return badRequest(err.message);
        throw err;
      }
    }

    const webhook = await withRetry(() =>
      prisma.n8nWebhook.update({
        where: { id: existing.id },
        data: {
          ...parsed.data,
          payloadTemplate: parsed.data.payloadTemplate
            ? (parsed.data.payloadTemplate as Prisma.InputJsonValue)
            : undefined,
        },
      })
    );
    return ok(webhook);
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await findWebhook(params!.id, params!.whid, organizationId);
    if (!existing) return notFound("Webhook");
    await prisma.n8nWebhook.delete({ where: { id: existing.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
