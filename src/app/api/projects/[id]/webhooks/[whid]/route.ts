import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateWebhookSchema = z.object({
  name: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  payloadTemplate: z.record(z.unknown()).optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateWebhookSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const webhook = await withRetry(() =>
      prisma.n8nWebhook.update({
        where: { id: params!.whid },
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
});

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.n8nWebhook.delete({ where: { id: params!.whid } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
});
