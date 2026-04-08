import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateMilestoneSchema = z.object({
  phase: z.enum(["BUSINESS_CASE", "DATA_DISCOVERY", "MODEL_DEVELOPMENT", "TESTING_VALIDATION", "DEPLOYMENT", "MONITORING"]),
  name: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string(),
  isGate: z.boolean().optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const milestones = await withRetry(() =>
      prisma.milestone.findMany({
        where: { projectId: params!.id },
        orderBy: { targetDate: "asc" },
      })
    );
    return ok(milestones);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = CreateMilestoneSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const milestone = await withRetry(() =>
      prisma.milestone.create({
        data: {
          projectId: params!.id,
          phase: parsed.data.phase as never,
          name: parsed.data.name,
          description: parsed.data.description,
          targetDate: new Date(parsed.data.targetDate),
          isGate: parsed.data.isGate ?? false,
        },
      })
    );
    return ok(milestone, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
