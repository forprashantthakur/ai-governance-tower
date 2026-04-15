import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  modelId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  likelihood: z.number().int().min(1).max(5),
  severity: z.number().int().min(1).max(5),
  harmCategory: z.enum(["DISCRIMINATION","PRIVACY_VIOLATION","FINANCIAL_HARM","PHYSICAL_HARM","REPUTATIONAL_HARM","AUTONOMY_VIOLATION","SOCIETAL_HARM","SECURITY_HARM","OTHER"]),
  affectedGroups: z.array(z.string()).optional(),
  mitigations: z.string().optional(),
  isAddressed: z.boolean().optional(),
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const scenarios = await prisma.misuseScenario.findMany({
      where: modelId ? { modelId } : undefined,
      include: { model: { select: { id: true, name: true } } },
      orderBy: [{ severity: "desc" }, { likelihood: "desc" }],
    }).catch(() => []);
    return ok(scenarios);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const scenario = await prisma.misuseScenario.create({ data: { ...parsed.data, affectedGroups: parsed.data.affectedGroups ?? [] } });
    return created(scenario);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
