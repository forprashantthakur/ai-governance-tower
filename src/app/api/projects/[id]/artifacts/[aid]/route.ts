import { NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { ArtifactCategory } from "@prisma/client";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.nativeEnum(ArtifactCategory).optional(),
  description: z.string().optional().nullable(),
  version: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

// ─── PATCH /api/projects/[id]/artifacts/[aid] ─────────────────────────────────
export const PATCH = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const body = await req.json();
      const parsed = UpdateSchema.safeParse(body);
      if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

      const existing = await withRetry(() =>
        prisma.projectArtifact.findFirst({
          where: { id: params!.aid, projectId: params!.id },
        })
      );
      if (!existing) return notFound("Artifact not found");

      const updated = await withRetry(() =>
        prisma.projectArtifact.update({
          where: { id: params!.aid },
          data: {
            ...(parsed.data.name !== undefined && { name: parsed.data.name }),
            ...(parsed.data.category !== undefined && { category: parsed.data.category }),
            ...(parsed.data.description !== undefined && { description: parsed.data.description ?? undefined }),
            ...(parsed.data.version !== undefined && { version: parsed.data.version ?? undefined }),
            ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
          },
        })
      );

      await logAudit({
        userId: user.userId,
        organizationId: user.organizationId,
        action: "UPDATE",
        resource: "ProjectArtifact",
        resourceId: params!.aid,
        before: existing,
        after: parsed.data,
        ipAddress: getClientIp(req),
      });

      return ok({ ...updated, size: Number(updated.size) });
    } catch (err) {
      return serverError(err);
    }
  },
  "RISK_OFFICER"
);

// ─── DELETE /api/projects/[id]/artifacts/[aid] ────────────────────────────────
export const DELETE = withAuth(
  async (req: NextRequest, { user, params }) => {
    try {
      const existing = await withRetry(() =>
        prisma.projectArtifact.findFirst({
          where: { id: params!.aid, projectId: params!.id },
        })
      );
      if (!existing) return notFound("Artifact not found");

      // Best-effort blob deletion — don't fail the request if blob removal fails
      try {
        await del(existing.url);
      } catch (blobErr) {
        console.warn("[Artifacts] Blob deletion failed (continuing):", blobErr);
      }

      await withRetry(() =>
        prisma.projectArtifact.delete({ where: { id: params!.aid } })
      );

      await logAudit({
        userId: user.userId,
        organizationId: user.organizationId,
        action: "DELETE",
        resource: "ProjectArtifact",
        resourceId: params!.aid,
        before: existing,
        ipAddress: getClientIp(req),
      });

      return ok({ deleted: true });
    } catch (err) {
      return serverError(err);
    }
  },
  "RISK_OFFICER"
);
