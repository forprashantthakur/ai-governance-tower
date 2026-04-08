import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.projectAIModel.delete({
      where: { projectId_modelId: { projectId: params!.id, modelId: params!.modelId } },
    });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
});
