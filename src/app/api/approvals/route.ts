import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const StepSchema = z.object({
  stepType: z.enum(["RISK_OFFICER","LEGAL","ETHICS","DATA_PROTECTION","EXECUTIVE","CUSTOM"]),
  label: z.string().min(1),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

const CreateSchema = z.object({
  modelId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  steps: z.array(StepSchema).min(1),
});

export const GET = withAuth(async () => {
  try {
    const workflows = await prisma.approvalWorkflow.findMany({
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
        requester: { select: { id: true, name: true } },
        steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
    return ok(workflows);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { steps, ...wf } = parsed.data;
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        ...wf,
        dueDate: wf.dueDate ? new Date(wf.dueDate) : undefined,
        requestedBy: user.userId,
        steps: {
          create: steps.map((s, i) => ({
            stepType: s.stepType,
            label: s.label,
            assigneeId: s.assigneeId,
            dueDate: s.dueDate ? new Date(s.dueDate) : undefined,
            stepOrder: i + 1,
          })),
        },
      },
      include: {
        model: { select: { id: true, name: true, type: true, status: true } },
        requester: { select: { id: true, name: true } },
        steps: { include: { assignee: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
      },
    });
    return created(workflow);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
