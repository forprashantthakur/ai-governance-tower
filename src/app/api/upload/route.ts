import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

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
export const POST = withAuth(async (req: NextRequest, { user }) => {
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

    // Upload to Vercel Blob
    const blob = await put(
      `evidence/${user.userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file,
      {
        access: "public",
        contentType: file.type,
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
    // If Vercel Blob is not configured, return a helpful message
    if (err instanceof Error && err.message.includes("BLOB_READ_WRITE_TOKEN")) {
      return serverError(
        new Error(
          "Vercel Blob not configured. Add BLOB_READ_WRITE_TOKEN to environment variables. " +
          "Enable Blob storage in your Vercel project dashboard under Storage → Blob."
        )
      );
    }
    return serverError(err);
  }
}, "RISK_OFFICER");

// GET /api/upload?controlId=&riskId=&modelId=&dataAssetId=
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const controlId   = searchParams.get("controlId")   || undefined;
    const riskId      = searchParams.get("riskId")      || undefined;
    const modelId     = searchParams.get("modelId")     || undefined;
    const dataAssetId = searchParams.get("dataAssetId") || undefined;

    if (!controlId && !riskId && !modelId && !dataAssetId) {
      return badRequest("Provide at least one filter: controlId, riskId, modelId, or dataAssetId");
    }

    const files = await prisma.evidenceFile.findMany({
      where: {
        ...(controlId   && { controlId }),
        ...(riskId      && { riskId }),
        ...(modelId     && { modelId }),
        ...(dataAssetId && { dataAssetId }),
      },
      orderBy: { uploadedAt: "desc" },
    });

    return ok({ files, total: files.length });
  } catch (err) {
    return serverError(err);
  }
});

// DELETE /api/upload?id=<fileId>
export const DELETE = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("File id required");

    await prisma.evidenceFile.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
