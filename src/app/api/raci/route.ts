import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const LAYERS = ["BOARD", "BOARD_COMMITTEE", "EXECUTIVE", "MANAGEMENT", "OPERATIONAL"] as const;

const CreateSchema = z.object({
  activity: z.string().min(1).max(300),
  lifecyclePhase: z.string().min(1).max(100),
  layer: z.enum(LAYERS).default("MANAGEMENT"),
  responsible: z.array(z.string()).default([]),
  accountable: z.string().max(200).nullable().optional(),
  consulted: z.array(z.string()).default([]),
  informed: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

// GET /api/raci
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const phase = searchParams.get("phase") ?? undefined;
    const layer = searchParams.get("layer") ?? undefined;

    // Tables may not exist yet on a stale DB — return empty gracefully rather than 500
    let assignments: Awaited<ReturnType<typeof prisma.raciAssignment.findMany>> = [];
    try {
      assignments = await prisma.raciAssignment.findMany({
        where: {
          organizationId,
          ...(phase && { lifecyclePhase: phase }),
          ...(layer && { layer: layer as (typeof LAYERS)[number] }),
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    } catch {
      assignments = [];
    }

    return ok({ assignments });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/raci
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const assignment = await prisma.raciAssignment.create({
      data: { organizationId, ...parsed.data },
    });

    return created(assignment);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
