import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const AddResourceSchema = z.object({
  userId: z.string(),
  role: z.enum(["LEAD", "CONTRIBUTOR", "REVIEWER", "STAKEHOLDER", "OBSERVER"]).optional(),
  allocationPct: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hourlyRate: z.number().optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const resources = await withRetry(() =>
      prisma.projectResource.findMany({
        where: { projectId: params!.id },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: "asc" },
      })
    );
    return ok(resources);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = AddResourceSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const resource = await withRetry(() =>
      prisma.projectResource.create({
        data: {
          projectId: params!.id,
          userId: parsed.data.userId,
          role: (parsed.data.role ?? "CONTRIBUTOR") as never,
          allocationPct: parsed.data.allocationPct ?? 50,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
          hourlyRate: parsed.data.hourlyRate,
        },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      })
    );
    return ok(resource, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
