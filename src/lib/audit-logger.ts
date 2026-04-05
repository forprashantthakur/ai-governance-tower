import { AuditAction } from "@prisma/client";
import { prisma } from "./prisma";

interface LogAuditParams {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  modelId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        modelId: params.modelId,
        before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
        after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });
  } catch (err) {
    // Audit logging must never crash the main request
    console.error("[AuditLogger] Failed to write audit log:", err);
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
