import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public health check — no auth required
export function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    routes: ["GET /api/maturity-assessment", "POST /api/maturity-assessment"],
  });
}
