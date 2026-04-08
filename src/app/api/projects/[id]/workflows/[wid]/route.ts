import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const SaveCanvasSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  canvasData: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
    viewport: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
  }).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const workflow = await withRetry(() =>
      prisma.workflowCanvas.findUnique({ where: { id: params!.wid } })
    );
    return ok(workflow);
  } catch (err) {
    return serverError(err);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = SaveCanvasSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.canvasData) data.canvasData = parsed.data.canvasData;

    const workflow = await withRetry(() =>
      prisma.workflowCanvas.update({
        where: { id: params!.wid },
        data: { ...data, version: { increment: 1 } },
      })
    );
    return ok(workflow);
  } catch (err) {
    return serverError(err);
  }
});

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.workflowCanvas.delete({ where: { id: params!.wid } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
});
