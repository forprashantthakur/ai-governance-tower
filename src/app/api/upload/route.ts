import { NextRequest } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";

/** Evidence has no organizationId column; it belongs to the org of whatever it is attached to. */
function evidenceInOrg(organizationId: string) {
  return {
    OR: [
      { model: { organizationId } },
      { dataAsset: { organizationId } },
      { control: { model: { organizationId } } },
      { risk: { model: { organizationId } } },
    ],
  };
}

/** Every parent id supplied must belong to the caller's organization. */
async function parentsInOrg(
  ids: { controlId?: string; riskId?: string; modelId?: string; dataAssetId?: string },
  organizationId: string
) {
  const checks = await Promise.all([
    ids.controlId ? prisma.complianceControl.count({ where: { id: ids.controlId, model: { organizationId } } }) : 1,
    ids.riskId ? prisma.riskAssessment.count({ where: { id: ids.riskId, model: { organizationId } } }) : 1,
    ids.modelId ? prisma.aIModel.count({ where: { id: ids.modelId, organizationId } }) : 1,
    ids.dataAssetId ? prisma.dataAsset.count({ where: { id: ids.dataAssetId, organizationId } }) : 1,
  ]);
  return checks.every((c) => c === 1);
}

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "text/plain",
  "text/csv",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// POST /api/upload
// multipart/form-data: file, controlId?, riskId?, modelId?, dataAssetId?, section?, description?
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return badRequest("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest(`File type '${file.type}' not allowed. Accepted: PDF, Word, Excel, PNG, JPEG, TXT, CSV`);
    }
    if (file.size > MAX_SIZE) {
      return badRequest(`File too large. Maximum size is 20 MB (received ${(file.size / 1024 / 1024).toFixed(1)} MB)`);
    }

    const controlId    = (formData.get("controlId")   as string | null) || undefined;
    const riskId       = (formData.get("riskId")      as string | null) || undefined;
    const modelId      = (formData.get("modelId")     as string | null) || undefined;
    const dataAssetId  = (formData.get("dataAssetId") as string | null) || undefined;
    const section      = (formData.get("section")     as string | null) || undefined;
    const description  = (formData.get("description") as string | null) || undefined;

    if (!controlId && !riskId && !modelId && !dataAssetId)
      return badRequest("Attach the file to a control, risk assessment, model or data asset");
    if (!(await parentsInOrg({ controlId, riskId, modelId, dataAssetId }, organizationId)))
      return notFound("Parent record");

    // Upload to Vercel Blob (random suffix so URLs can't be guessed)
    const blob = await put(
      `evidence/${organizationId}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file,
      {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      }
    );

    // Persist metadata to DB
    const evidenceFile = await prisma.evidenceFile.create({
      data: {
        name: file.name,
        url: blob.url,
        size: file.size,
        mimeType: file.type,
        uploadedBy: user.userId,
        section,
        description,
        controlId,
        riskId,
        modelId,
        dataAssetId,
      },
    });

    return ok(evidenceFile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    // Surface known configuration / table errors clearly regardless of NODE_ENV
    if (msg.includes("BLOB_READ_WRITE_TOKEN")) {
      return badRequest(
        "Vercel Blob storage is not configured. Go to your Vercel project → Storage → Blob and create a store, then redeploy."
      );
    }
    if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("evidence_files")) {
      return badRequest(
        "Evidence files table not ready yet. The next Vercel deployment will create it automatically via prisma db push."
      );
    }
    return serverError(err);
  }
}, "RISK_OFFICER");

// GET /api/upload?controlId=&riskId=&modelId=&dataAssetId=
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const controlId   = searchParams.get("controlId")   || undefined;
    const riskId      = searchParams.get("riskId")      || undefined;
    const modelId     = searchParams.get("modelId")     || undefined;
    const dataAssetId = searchParams.get("dataAssetId") || undefined;

    if (!controlId && !riskId && !modelId && !dataAssetId) {
      return badRequest("Provide at least one filter: controlId, riskId, modelId, or dataAssetId");
    }

    try {
      const files = await prisma.evidenceFile.findMany({
        where: {
          ...(controlId   && { controlId }),
          ...(riskId      && { riskId }),
          ...(modelId     && { modelId }),
          ...(dataAssetId && { dataAssetId }),
          ...evidenceInOrg(organizationId),
        },
        take: 500,
        orderBy: { uploadedAt: "desc" },
      });
      return ok({ files, total: files.length });
    } catch {
      // Table doesn't exist yet (pending prisma db push) — return empty list
      return ok({ files: [], total: 0 });
    }
  } catch (err) {
    return serverError(err);
  }
});

// DELETE /api/upload?id=<fileId>
export const DELETE = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("File id required");

    const file = await prisma.evidenceFile.findFirst({ where: { id, ...evidenceInOrg(organizationId) } });
    if (!file) return notFound("File");
    try {
      await del(file.url); // remove the stored file, not just the database row
    } catch (blobErr) {
      console.warn("[upload] Blob deletion failed (continuing):", blobErr);
    }
    await prisma.evidenceFile.delete({ where: { id: file.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
