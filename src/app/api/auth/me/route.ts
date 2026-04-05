import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJwt, extractBearerToken } from "@/lib/auth/jwt";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    if (!token) return unauthorized();

    const payload = await verifyJwt(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) return unauthorized("User not found");

    return ok(user);
  } catch {
    return unauthorized("Invalid token");
  }
}
