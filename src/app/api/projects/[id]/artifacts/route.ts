import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { ArtifactCategory } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, boolean> = {
  // Documents
  "application/pdf": true,
  "application/msword": true,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
  "application/vnd.ms-excel": true,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
  "application/vnd.ms-powerpoint": true,
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
  // Text
  "text/plain": true,
  "text/csv": true,
  "text/markdown": true,
  // Images
  "image/png": true,
  "image/jpeg": true,
  "image/gif": true,
  "image/svg+xml": true,
  // ML model files
  "application/octet-stream": true,   // .pkl, .onnx, .h5, .pt, .bin
  // Archives
  "application/zip": true,
  "application/x-tar": true,
  "application/gzip": true,
  "application/x-gzip": true,
  // JSON / YAML (configs, schemas)
  "application/json": true,
  "application/x-yaml": true,
  "text/yaml": true,
};

const ARTIFACT_CATEGORIES = new Set<string>(Object.values(ArtifactCategory));

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ─── GET /api/projects/[id]/artifacts ─────────────────────────────────────────
export const GET = withAuth(async (req: NextRequest, { params }) => {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as ArtifactCategory | null;
    const q = searchParams.get("q") || undefined;

    const artifacts = await withRetry(() =>
      prisma.projectArtifact.findMany({
        where: {
          projectId: params!.id,
          ...(category && ARTIFACT_CATEGORIES.has(category) ? { category } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { tags: { has: q } },
                ],
              }
            : {}),
        },
        orderBy: { uploadedAt: "desc" },
      })
    );

    // Batch-resolve uploader names
    const uploaderIds = [...new Set(artifacts.map((a) => a.uploadedBy))];
    const uploaders = await withRetry(() =>
      prisma.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true },
      })
    );
    const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u.name]));

    const enriched = artifacts.map((a) => ({
      ...a,
      size: Number(a.size),
      uploader: { id: a.uploadedBy, name: uploaderMap[a.uploadedBy] ?? "Unknown" },
    }));

    return ok({ artifacts: enriched, total: enriched.length });
  } catch (err) {
    return serverError(err);
  }
});

// ─── POST /api/projects/[id]/artifacts ────────────────────────────────────────
export const POST = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return badRequest("No file provided");

      if (!ALLOWED_TYPES[file.type]) {
        return badRequest(
          `File type '${file.type}' is not supported. Allowed types include PDF, Word, Excel, CSV, images, JSON, YAML, Python pickle, ONNX, HDF5, PyTorch weights, and ZIP archives.`
        );
      }
      if (file.size > MAX_SIZE) {
        return badRequest(
          `File too large. Maximum size is 50 MB (received ${(file.size / 1024 / 1024).toFixed(1)} MB)`
        );
      }

      const rawCategory = (formData.get("category") as string | null) || "OTHER";
      const category = ARTIFACT_CATEGORIES.has(rawCategory)
        ? (rawCategory as ArtifactCategory)
        : ArtifactCategory.OTHER;

      const description = (formData.get("description") as string | null) || undefined;
      const version = (formData.get("version") as string | null) || undefined;
      const rawTags = formData.get("tags") as string | null;
      const tags = rawTags ? rawTags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      // Upload to Vercel Blob
      const blob = await put(
        `artifacts/${params!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._\-]/g, "_")}`,
        file,
        { access: "public", contentType: file.type }
      );

      const artifact = await withRetry(() =>
        prisma.projectArtifact.create({
          data: {
            projectId: params!.id,
            name: file.name,
            url: blob.url,
            size: file.size,
            mimeType: file.type,
            category,
            description,
            version,
            tags,
            uploadedBy: user.userId,
          },
        })
      );

      await logAudit({
        userId: user.userId,
        organizationId: user.organizationId,
        action: "CREATE",
        resource: "ProjectArtifact",
        resourceId: artifact.id,
        after: { name: file.name, category, projectId: params!.id },
        ipAddress: getClientIp(req),
      });

      return created({ ...artifact, size: Number(artifact.size) });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("BLOB_READ_WRITE_TOKEN") || msg.includes("blob")) {
        return badRequest(
          "Vercel Blob storage is not configured. Go to your Vercel project → Storage → Blob and create a store, then add the BLOB_READ_WRITE_TOKEN to your environment variables."
        );
      }
      if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("project_artifacts")) {
        return badRequest(
          "Artifacts table not ready yet. Run `npx prisma db push` to create it."
        );
      }
      return serverError(err);
    }
  },
  "RISK_OFFICER"
);
