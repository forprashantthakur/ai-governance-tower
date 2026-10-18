import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, conflict, serverError } from "@/lib/api-response";
import type { SoaControl } from "@prisma/client";

export const dynamic = "force-dynamic";

const DECISION_VALUES = ["APPLICABLE", "APPLICABLE_PLANNED", "NOT_APPLICABLE"] as const;
const IMPL_STATUS_VALUES = ["NOT_IMPLEMENTED", "PARTIAL", "IMPLEMENTED"] as const;

const CreateSchema = z.object({
  controlRef: z.string().min(1).max(30),
  controlTitle: z.string().min(1).max(300),
  objectiveGroup: z.string().min(1).max(100),
  controlObjective: z.string().min(1),
  decision: z.enum(DECISION_VALUES).optional(),
  justification: z.string().optional(),
  implStatus: z.enum(IMPL_STATUS_VALUES).optional(),
  implementationSummary: z.string().optional(),
  ownerRole: z.string().max(200).optional(),
  linkedPolicyCodes: z.array(z.string()).optional(),
});

// Rollup stats + the "excluded controls missing justification" audit check —
// shared shape with the PATCH-driven client-side recompute.
// Not exported: a Next.js route module may only export HTTP handlers and
// route config fields. Any other export fails the build.
function computeSoaStats(controls: Pick<SoaControl, "decision" | "implStatus" | "justification">[]) {
  const applicable = controls.filter((c) => c.decision === "APPLICABLE").length;
  const applicablePlanned = controls.filter((c) => c.decision === "APPLICABLE_PLANNED").length;
  const excluded = controls.filter((c) => c.decision === "NOT_APPLICABLE").length;
  const implemented = controls.filter((c) => c.implStatus === "IMPLEMENTED").length;
  const partial = controls.filter((c) => c.implStatus === "PARTIAL").length;
  const missingJustification = controls.filter(
    (c) => c.decision === "NOT_APPLICABLE" && !c.justification?.trim()
  ).length;
  return {
    total: controls.length,
    applicable: applicable + applicablePlanned,
    implemented,
    partial,
    excluded,
    missingJustification,
  };
}

// GET /api/soa — all Annex A controls for the org + rollup stats
export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const controls = await prisma.soaControl
      .findMany({
        where: { organizationId },
        orderBy: [{ objectiveGroup: "asc" }, { controlRef: "asc" }],
      })
      .catch(() => [] as SoaControl[]);

    return ok({ controls, stats: computeSoaStats(controls) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/soa — add a custom control (beyond the seeded 38)
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { controlRef, linkedPolicyCodes, ...rest } = parsed.data;

    try {
      const control = await prisma.soaControl.create({
        data: {
          organizationId,
          controlRef,
          linkedPolicyCodes: linkedPolicyCodes ?? [],
          ...rest,
        },
      });
      return created(control);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("Unique constraint")) {
        return conflict(`Control ${controlRef} already exists`);
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
