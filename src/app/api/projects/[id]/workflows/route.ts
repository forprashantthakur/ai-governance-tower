import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  canvasData: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
    viewport: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
  }),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const workflows = await withRetry(() =>
      prisma.workflowCanvas.findMany({
        where: { projectId: params!.id },
        orderBy: { updatedAt: "desc" },
      })
    );
    return ok(workflows);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = CreateWorkflowSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const workflow = await withRetry(() =>
      prisma.workflowCanvas.create({
        data: {
          projectId: params!.id,
          name: parsed.data.name,
          description: parsed.data.description,
          canvasData: {
            nodes: parsed.data.canvasData.nodes,
            edges: parsed.data.canvasData.edges,
            viewport: parsed.data.canvasData.viewport ?? { x: 0, y: 0, scale: 1 },
          },
          createdBy: user.userId,
        },
      })
    );
    return ok(workflow, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
