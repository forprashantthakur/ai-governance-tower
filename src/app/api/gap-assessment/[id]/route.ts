import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const UpdateAssessmentSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  framework: z.string().min(1).max(200).optional(),
  scope: z.string().nullable().optional(),
  assessorName: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "SIGNED_OFF"]).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// GET /api/gap-assessment/:id
export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    // findFirst with organizationId ensures cross-org reads return 404 instead of leaking data
    const assessment = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!assessment) return notFound("GapAssessment");

    const findings = await prisma.gapFinding.findMany({
      where: { assessmentId: params.id },
    });
    findings.sort((a, b) => {
      const sev = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
      if (sev !== 0) return sev;
      return a.requirementRef.localeCompare(b.requirementRef);
    });

    return ok({ ...assessment, findings });
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/gap-assessment/:id
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org mutations
    const existing = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("GapAssessment");

    const parsed = UpdateAssessmentSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { startedAt, completedAt, status, ...rest } = parsed.data;

    // Auto-stamp completedAt when the assessment is finished, unless caller set it explicitly
    const autoCompletedAt =
      completedAt === undefined &&
      (status === "COMPLETED" || status === "SIGNED_OFF") &&
      !existing.completedAt
        ? new Date()
        : undefined;

    const updated = await prisma.gapAssessment.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(status !== undefined && { status }),
        ...(startedAt !== undefined && { startedAt: startedAt ? new Date(startedAt) : null }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(autoCompletedAt && { completedAt: autoCompletedAt }),
      },
      include: { _count: { select: { findings: true } } },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/gap-assessment/:id
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    // Scope lookup to org — prevents cross-org deletions
    const existing = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("GapAssessment");

    await prisma.gapAssessment.delete({ where: { id: params.id } }); // cascades to findings

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
