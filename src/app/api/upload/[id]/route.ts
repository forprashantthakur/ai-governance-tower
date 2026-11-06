import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { evidenceInOrg } from "@/lib/tenant";
import { notFound, serverError } from "@/lib/api-response";
import { streamStoredFile, StorageNotConfiguredError, STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/file-storage";

export const dynamic = "force-dynamic";

// GET /api/upload/:id — download one evidence file, only for members of the
// organization that owns the record it is attached to.
export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const file = await prisma.evidenceFile.findFirst({
      where: { id: params.id, ...evidenceInOrg(organizationId) },
      select: { url: true, name: true, mimeType: true },
    });
    if (!file) return notFound("File");
    return (await streamStoredFile(file.url, file)) as NextResponse;
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json({ success: false, error: STORAGE_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    return serverError(err);
  }
});
