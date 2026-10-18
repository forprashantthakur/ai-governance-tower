import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, conflict, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const DOC_TYPES = ["POLICY", "MANUAL", "PROCEDURE", "STANDARD", "GUIDELINE", "CHARTER", "SOP"] as const;
const DOC_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "BOARD_APPROVAL_PENDING",
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
  "RETIRED",
] as const;

const CreateSchema = z.object({
  docCode: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  type: z.enum(DOC_TYPES).default("POLICY"),
  status: z.enum(DOC_STATUSES).default("DRAFT"),
  version: z.string().min(1).max(30).default("1.0"),
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  approverRole: z.string().max(200).nullable().optional(),
  approvedBy: z.string().max(200).nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  effectiveFrom: z.coerce.date().nullable().optional(),
  nextReviewDate: z.coerce.date().nullable().optional(),
  integratesWith: z.array(z.string()).default([]),
  frameworkRefs: z.array(z.string()).default([]),
});

// GET /api/policies
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const search = searchParams.get("search")?.trim().toLowerCase() ?? undefined;

    // Tables may not exist yet on a stale DB — return empty gracefully rather than 500
    let allDocuments: Awaited<ReturnType<typeof prisma.policyDocument.findMany>> = [];
    try {
      allDocuments = await prisma.policyDocument.findMany({
        where: { organizationId },
        orderBy: [{ docCode: "asc" }],
      });
    } catch {
      allDocuments = [];
    }

    const documents = allDocuments.filter((d) => {
      if (status && d.status !== status) return false;
      if (type && d.type !== type) return false;
      if (search && !(d.docCode.toLowerCase().includes(search) || d.title.toLowerCase().includes(search))) {
        return false;
      }
      return true;
    });

    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const stats = {
      total: allDocuments.length,
      published: allDocuments.filter((d) => d.status === "PUBLISHED").length,
      pendingBoardApproval: allDocuments.filter((d) => d.status === "BOARD_APPROVAL_PENDING").length,
      dueForReview90: allDocuments.filter(
        (d) => d.nextReviewDate !== null && d.nextReviewDate >= now && d.nextReviewDate <= horizon
      ).length,
    };

    return ok({ documents, stats });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/policies
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.policyDocument.findFirst({
      where: { organizationId, docCode: parsed.data.docCode },
    });
    if (existing) return conflict(`Document code "${parsed.data.docCode}" already exists.`);

    const document = await prisma.policyDocument.create({
      data: { organizationId, ...parsed.data },
    });

    return created(document);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
