import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpsertSchema = z.object({
  modelId: z.string().uuid(),
  // §5.3
  intendedUses: z.array(z.string()).optional(),
  unintendedUses: z.array(z.string()).optional(),
  // §5.5
  algorithmType: z.string().optional(),
  algorithmDescription: z.string().optional(),
  developmentApproach: z.string().optional(),
  // §5.6
  geographicScope: z.array(z.string()).optional(),
  deploymentLanguages: z.array(z.string()).optional(),
  environmentDescription: z.string().optional(),
  // §5.8 impact dimensions
  accountability: z.string().optional(),
  transparency: z.string().optional(),
  fairness: z.string().optional(),
  privacy: z.string().optional(),
  reliability: z.string().optional(),
  safety: z.string().optional(),
  explainabilityDoc: z.string().optional(),
  environmentalImpact: z.string().optional(),
  failureMisuse: z.string().optional(),
});

// GET /api/iso42005?modelId=<id>
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    if (!modelId) return badRequest("modelId required");

    const model = await prisma.aIModel.findUnique({
      where: { id: modelId },
      select: {
        id: true, name: true, type: true, status: true,
        explainability: true, humanOversight: true,
        isPiiProcessing: true, isFinancial: true, isCritical: true,
      },
    });
    if (!model) return notFound("Model not found");

    // Tables may not exist yet if prisma db push hasn't run — return empty gracefully
    let impact = null;
    let parties: unknown[] = [];
    try {
      [impact, parties] = await Promise.all([
        prisma.impactAssessment.findUnique({ where: { modelId } }),
        prisma.interestedParty.findMany({ where: { modelId }, orderBy: { createdAt: "asc" } }),
      ]);
    } catch {
      // Tables don't exist yet — safe to ignore, page will work in read-only mode
    }

    return ok({ model, impact, parties });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/iso42005 — upsert full impact assessment (§5.3 + §5.5 + §5.6 + §5.8)
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = UpsertSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { modelId, ...data } = parsed.data;

    try {
      const impact = await prisma.impactAssessment.upsert({
        where: { modelId },
        create: { modelId, ...data },
        update: data,
      });
      return ok(impact);
    } catch (dbErr: unknown) {
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation")) {
        return serverError(new Error(
          "Database tables not yet created. Run 'npx prisma db push' or redeploy to Vercel to create the new tables."
        ));
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
