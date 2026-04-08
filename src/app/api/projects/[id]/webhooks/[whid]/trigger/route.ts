import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { fireWebhookById } from "@/lib/n8n-trigger";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const result = await fireWebhookById(params!.whid);
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
});
