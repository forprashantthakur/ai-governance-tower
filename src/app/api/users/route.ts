import { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    const users = await withRetry(() =>
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, department: true },
        orderBy: { name: "asc" },
      })
    );
    return ok(users);
  } catch (err) {
    return serverError(err);
  }
});
