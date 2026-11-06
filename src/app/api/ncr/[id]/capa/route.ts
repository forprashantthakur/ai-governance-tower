import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { created, badRequest, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateCapaSchema = z.object({
  actionType: z.enum(["CORRECTIVE", "PREVENTIVE"]).default("CORRECTIVE"),
  description: z.string().min(1),
  ownerRole: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED", "OVERDUE"]).default("OPEN"),
});

// POST /api/ncr/:id/capa
export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent NCR's organizationId
    const ncr = await prisma.nonConformity.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!ncr) return notFound("NonConformity");

    const parsed = CreateCapaSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { dueDate, status, ...rest } = parsed.data;

    const resolvedDueDate = dueDate ? new Date(dueDate) : null;
    // Persist OVERDUE if the due date has already passed and the CAPA is not yet closed out
    const resolvedStatus =
      resolvedDueDate && resolvedDueDate < new Date() && (status === "OPEN" || status === "IN_PROGRESS")
        ? "OVERDUE"
        : status;

    // Sequential, human-readable CAPA reference scoped to the parent NCR
    // Highest existing number + 1 (a row count repeats numbers after a delete).
    const siblings = await prisma.capa.findMany({ where: { ncrId: params.id }, select: { capaRef: true } });
    const maxSeq = siblings.reduce((m: number, c: { capaRef: string | null }) => {
      const n = Number.parseInt((c.capaRef ?? "").split("-C").pop() ?? "", 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const capaRef = `${ncr.ncrRef}-C${maxSeq + 1}`;

    const capa = await prisma.capa.create({
      data: {
        ...rest,
        capaRef,
        ncrId: params.id,
        status: resolvedStatus,
        dueDate: resolvedDueDate,
      },
    });

    return created(capa);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
