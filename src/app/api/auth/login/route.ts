import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return unauthorized("Invalid credentials");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return unauthorized("Invalid credentials");

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return ok(
      {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
      undefined,
      200
    );
  } catch (err) {
    return serverError(err);
  }
}
