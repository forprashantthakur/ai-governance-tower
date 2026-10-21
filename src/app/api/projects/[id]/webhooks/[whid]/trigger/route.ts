import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { ok, notFound, serverError } from "@/lib/api-response";
import { fireWebhookById } from "@/lib/n8n-trigger";
import { findProjectInOrg } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const result = await fireWebhookById(params!.whid, params!.id);
    if (!result) return notFound("Webhook");
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
