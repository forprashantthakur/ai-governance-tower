import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SECRET = "gTower2026Reset!";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("your-anthropic")) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set", keyPresent: false });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const models = await (anthropic.models as { list: () => Promise<{ data: { id: string }[] }> }).list();
    return NextResponse.json({
      keyPresent: true,
      keyPrefix: apiKey.slice(0, 20) + "...",
      models: models.data.map((m) => m.id),
    });
  } catch (err) {
    // models.list() may not exist on older SDK — fall back to a test message
    try {
      const anthropic2 = new Anthropic({ apiKey });
      // Quick test with a minimal call to see what error we get
      await anthropic2.messages.create({
        model: "claude-opus-4-5-20251101",
        max_tokens: 5,
        messages: [{ role: "user", content: "hi" }],
      });
      return NextResponse.json({ keyPresent: true, workingModel: "claude-opus-4-5-20251101" });
    } catch (e2) {
      return NextResponse.json({
        keyPresent: true,
        keyPrefix: apiKey.slice(0, 20) + "...",
        listError: err instanceof Error ? err.message : String(err),
        testError: e2 instanceof Error ? e2.message : String(e2),
      });
    }
  }
}
