import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — the session cookie is HttpOnly, so only the server can remove it.
export async function POST() {
  return clearSessionCookie(NextResponse.json({ success: true, data: { signedOut: true } }));
}
