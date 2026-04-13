import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  severity: z.number().int().min(1).max(5).optional(),
  harmCategory: z.enum(["DISCRIMINATION","PRIVACY_VIOLATION","FINANCIAL_HARM","PHYSICAL_HARM","REPUTATIONAL_HARM","AUTONOMY_VIOLATION","SOCIETAL_HARM","SECURITY_HARM","OTHER"]).optional(),
  affectedGroups: z.array(z.string()).optional(),
  mitigations: z.string().optional(),
  isAddressed: z.boolean().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const scenario = await prisma.misuseScenario.update({ where: { id: params.id }, data: parsed.data }).catch(() => null);
    if (!scenario) return notFound("Scenario");
    return ok(scenario);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.misuseScenario.delete({ where: { id: params.id } }).catch(() => {});
    return noContent();
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
