import { NextRequest } from "next/server";
import { z } from "zod";
import type { FreeAiItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, conflict, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { FREE_AI_CATALOG } from "@/lib/frameworks/free-ai";

export const dynamic = "force-dynamic";

const ITEM_TYPES = ["SUTRA", "RECOMMENDATION"] as const;
const STATUSES = ["PASS", "FAIL", "PARTIAL", "NOT_APPLICABLE", "PENDING_REVIEW"] as const;

const CreateSchema = z.object({
  itemCode: z.string().min(1).max(30),
  itemType: z.enum(ITEM_TYPES),
  pillar: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  applicability: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  ownerRole: z.string().max(200).optional(),
  evidence: z.string().optional(),
  gapNotes: z.string().optional(),
  targetDate: z.coerce.date().optional(),
});

// The DB has no column for the catalogue's actionOwner/timeline — look up
// timeline by itemCode here so the "short-term outstanding" stat can be
// computed server-side without persisting a field that belongs to the
// reference catalogue, not the org's tracked state.
const TIMELINE_BY_CODE: Record<string, string> = Object.fromEntries(
  FREE_AI_CATALOG.map((i) => [i.itemCode, i.timeline])
);

function emptyStats() {
  return { total: 0, compliant: 0, gaps: 0, shortTermOutstanding: 0 };
}

// Not exported: a Next.js route module may only export HTTP handlers and
// route config fields. Any other export fails the build.
function computeFreeAiStats(items: Pick<FreeAiItem, "itemCode" | "status">[]) {
  const total = items.length;
  if (total === 0) return emptyStats();
  const compliant = items.filter((i) => i.status === "PASS").length;
  const gaps = items.filter((i) => i.status === "FAIL").length;
  const shortTermOutstanding = items.filter(
    (i) => TIMELINE_BY_CODE[i.itemCode] === "SHORT_TERM" && i.status !== "PASS"
  ).length;
  return { total, compliant, gaps, shortTermOutstanding };
}

// GET /api/free-ai — all tracked FREE-AI items for the org + rollup stats
export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    let items: FreeAiItem[] = [];
    try {
      items = await prisma.freeAiItem.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully instead of 500
      return ok({ rows: [], stats: emptyStats() });
    }

    return ok({ rows: items, stats: computeFreeAiStats(items) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/free-ai — add a custom item (beyond the seeded 33)
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    try {
      const row = await prisma.freeAiItem.create({
        data: { organizationId, ...parsed.data },
      });

      await logAudit({
        userId: user.userId,
        organizationId,
        action: "CREATE",
        resource: "FreeAiItem",
        resourceId: row.id,
        after: row,
        ipAddress: getClientIp(req),
      });

      return created(row);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("Unique constraint")) {
        return conflict(`Item ${parsed.data.itemCode} already exists`);
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
