import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DecideSchema = z.object({
  status: z.enum(["APPROVED","REJECTED","ESCALATED"]),
  comments: z.string().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = DecideSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const step = await prisma.approvalStep.update({
      where: { id: params.stepId },
      data: { ...parsed.data, decidedAt: new Date() },
    }).catch(() => null);
    if (!step) return notFound("Step");

    // Recompute workflow overall status
    const allSteps = await prisma.approvalStep.findMany({ where: { workflowId: params.id } });
    let wfStatus: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" = "PENDING";
    if (allSteps.some((s) => s.status === "REJECTED")) wfStatus = "REJECTED";
    else if (allSteps.some((s) => s.status === "ESCALATED")) wfStatus = "ESCALATED";
    else if (allSteps.every((s) => s.status === "APPROVED")) wfStatus = "APPROVED";

    await prisma.approvalWorkflow.update({
      where: { id: params.id },
      data: {
        status: wfStatus,
        completedAt: wfStatus === "APPROVED" || wfStatus === "REJECTED" ? new Date() : undefined,
      },
    });

    return ok(step);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
