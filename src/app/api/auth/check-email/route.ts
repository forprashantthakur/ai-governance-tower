import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  if (!email) return badRequest("Email is required");
  const user = await prisma.user.findUnique({ where: { email } });
  return ok({ available: !user });
}
