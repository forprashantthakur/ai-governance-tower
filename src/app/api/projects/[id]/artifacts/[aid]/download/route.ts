import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { findProjectInOrg } from "@/lib/tenant";
import { notFound, serverError } from "@/lib/api-response";
import { streamStoredFile, StorageNotConfiguredError, STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/file-storage";

export const dynamic = "force-dynamic";

// GET /api/projects/:id/artifacts/:aid/download — only for members of the project's organization.
export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params.id, organizationId))) return notFound("Project");
    const artifact = await withRetry(() =>
      prisma.projectArtifact.findFirst({
        where: { id: params.aid, projectId: params.id },
        select: { url: true, name: true, mimeType: true },
      })
    );
    if (!artifact) return notFound("Artifact");
    return (await streamStoredFile(artifact.url, artifact)) as NextResponse;
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ success: false, error: STORAGE_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    return serverError(err);
  }
});
