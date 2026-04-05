import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

// GET /api/audit
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50"));
    const userId = searchParams.get("userId");
    const resource = searchParams.get("resource");
    const action = searchParams.get("action");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Prisma.AuditLogWhereInput = {
      ...(userId && { userId }),
      ...(resource && { resource }),
      ...(action && { action: action as Prisma.EnumAuditActionFilter }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return serverError(err);
  }
}, "AUDITOR");
