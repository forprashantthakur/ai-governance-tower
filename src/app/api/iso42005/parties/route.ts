import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const PartySchema = z.object({
  modelId: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(["USER", "DATA_SUBJECT", "DEPLOYER", "DEVELOPER", "REGULATOR", "SUPPLIER", "OTHER"]),
  interest: z.string().optional(),
  consulted: z.boolean().optional(),
  consultedAt: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/iso42005/parties?modelId=<id>
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    if (!modelId) return badRequest("modelId required");

    const parties = await prisma.interestedParty.findMany({
      where: { modelId },
      orderBy: { createdAt: "asc" },
    });

    return ok({ parties, total: parties.length });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/iso42005/parties
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = PartySchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const party = await prisma.interestedParty.create({
      data: {
        ...parsed.data,
        consultedAt: parsed.data.consultedAt ? new Date(parsed.data.consultedAt) : undefined,
      },
    });

    return created(party);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/iso42005/parties?id=<id>
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("id required");

    await prisma.interestedParty.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
