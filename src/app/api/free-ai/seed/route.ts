import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { FREE_AI_CATALOG } from "@/lib/frameworks/free-ai";

export const dynamic = "force-dynamic";

// POST /api/free-ai/seed — idempotently install the 7 Sutras + 26
// Recommendations from the RBI FREE-AI committee report for this org. Safe
// to call repeatedly: existing items (matched on the organizationId +
// itemCode unique constraint) are left untouched so any status/evidence
// already recorded against them is never clobbered.
export const POST = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const before = await prisma.freeAiItem.count({ where: { organizationId } });

    await prisma.freeAiItem.createMany({
      data: FREE_AI_CATALOG.map((item) => ({
        organizationId,
        itemCode: item.itemCode,
        itemType: item.itemType,
        pillar: item.pillar,
        title: item.title,
        description: item.description,
        applicability: item.applicability,
        ownerRole: item.ownerRole,
      })),
      skipDuplicates: true,
    });

    const after = await prisma.freeAiItem.count({ where: { organizationId } });

    return ok({ insertedCount: after - before, totalCount: after });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
