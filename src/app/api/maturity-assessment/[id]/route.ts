import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, notFound, serverError } from "@/lib/api-response";
import type { RouteContext } from "@/lib/with-auth";

export const dynamic = "force-dynamic";

// GET /api/maturity-assessment/:id
export const GET = withAuth(async (_req: NextRequest, ctx: RouteContext) => {
  try {
    const { organizationId, params } = ctx;
    const assessment = await prisma.maturityAssessment.findUnique({
      where: { id: params.id, organizationId },
    });
    if (!assessment) return notFound("Assessment");
    return ok(assessment);
  } catch (err) {
    return serverError(err);
  }
});
