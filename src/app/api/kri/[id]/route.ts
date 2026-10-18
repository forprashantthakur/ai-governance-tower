import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateKriSchema = z.object({
  kriCode: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(300).optional(),
  domain: z.enum(["TECHNOLOGY", "CYBER", "AI", "DATA"]).optional(),
  description: z.string().max(4000).optional(),
  formula: z.string().max(2000).optional(),
  unit: z.string().min(1).max(20).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY"]).optional(),
  direction: z.enum(["LOWER_IS_BETTER", "HIGHER_IS_BETTER"]).optional(),
  greenThreshold: z.coerce.number().optional(),
  amberThreshold: z.coerce.number().optional(),
  redThreshold: z.coerce.number().optional(),
  ownerRole: z.string().max(200).optional(),
  reportedTo: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/kri/:id
export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const definition = await prisma.kriDefinition.findFirst({
      where: { id: params.id, organizationId },
      include: { readings: { orderBy: { periodLabel: "asc" } } },
    });
    if (!definition) return notFound("KRI definition");
    return ok(definition);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/kri/:id
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.kriDefinition.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("KRI definition");

    const parsed = UpdateKriSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    if (parsed.data.kriCode && parsed.data.kriCode !== existing.kriCode) {
      const clash = await prisma.kriDefinition.findFirst({
        where: { organizationId, kriCode: parsed.data.kriCode },
      });
      if (clash) return badRequest(`KRI code '${parsed.data.kriCode}' already exists`);
    }

    const updated = await prisma.kriDefinition.update({
      where: { id: params.id },
      data: parsed.data,
      include: { readings: { orderBy: { periodLabel: "asc" } } },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/kri/:id — cascades to its readings
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const existing = await prisma.kriDefinition.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("KRI definition");

    await prisma.kriDefinition.delete({ where: { id: params.id } });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
