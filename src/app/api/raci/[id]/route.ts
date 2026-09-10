import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const LAYERS = ["BOARD", "BOARD_COMMITTEE", "EXECUTIVE", "MANAGEMENT", "OPERATIONAL"] as const;

const UpdateSchema = z.object({
  activity: z.string().min(1).max(300).optional(),
  lifecyclePhase: z.string().min(1).max(100).optional(),
  layer: z.enum(LAYERS).optional(),
  responsible: z.array(z.string()).optional(),
  accountable: z.string().max(200).nullable().optional(),
  consulted: z.array(z.string()).optional(),
  informed: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

// PATCH /api/raci/:id
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.raciAssignment.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return notFound("RaciAssignment");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const d = parsed.data;

    const updated = await prisma.raciAssignment.update({
      where: { id: params.id },
      data: {
        ...(d.activity !== undefined && { activity: d.activity }),
        ...(d.lifecyclePhase !== undefined && { lifecyclePhase: d.lifecyclePhase }),
        ...(d.layer !== undefined && { layer: d.layer }),
        ...(d.responsible !== undefined && { responsible: d.responsible }),
        ...(d.accountable !== undefined && { accountable: d.accountable }),
        ...(d.consulted !== undefined && { consulted: d.consulted }),
        ...(d.informed !== undefined && { informed: d.informed }),
        ...(d.notes !== undefined && { notes: d.notes }),
        ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
      },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/raci/:id
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.raciAssignment.findFirst({ where: { id: params.id, organizationId } });
    if (!existing) return notFound("RaciAssignment");

    await prisma.raciAssignment.delete({ where: { id: params.id } });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
