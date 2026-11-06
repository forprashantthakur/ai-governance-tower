import { NextRequest } from "next/server";
import { Prisma, AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { parsePaging } from "@/lib/pagination";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = 'force-dynamic';

// GET /api/audit — org-scoped audit log (AUDITOR+)
export const GET = withAuth(async (req, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePaging(searchParams, { defaultLimit: 50, maxLimit: 200 });
    const userId = searchParams.get("userId");
    const resource = searchParams.get("resource");
    const action = searchParams.get("action");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime())))
      return badRequest("from/to must be valid dates");
    if (action && !(Object.values(AuditAction) as string[]).includes(action))
      return badRequest("Unknown action");

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(userId && { userId }),
      ...(resource && { resource }),
      ...(action && { action: action as Prisma.EnumAuditActionFilter }),
      ...(from || to
        ? {
            createdAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
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
