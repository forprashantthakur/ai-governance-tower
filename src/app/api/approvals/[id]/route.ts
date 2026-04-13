import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: params.id },
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
        requester: { select: { id: true, name: true } },
        steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
      },
    }).catch(() => null);
    if (!workflow) return notFound("Approval workflow");
    return ok(workflow);
  } catch (err) { return serverError(err); }
});
