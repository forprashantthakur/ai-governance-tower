import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type NcrTypeLiteral = "MAJOR" | "MINOR" | "OBSERVATION" | "OFI";
type NcrStatusLiteral = "OPEN" | "UNDER_INVESTIGATION" | "CAPA_ASSIGNED" | "PENDING_VERIFICATION" | "CLOSED";

const CreateNcrSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1),
  type: z.enum(["MAJOR", "MINOR", "OBSERVATION", "OFI"]).default("MINOR"),
  clauseRef: z.string().optional(),
  source: z.string().optional(),
  raisedBy: z.string().optional(),
  raisedAt: z.string().datetime().optional(),
  rootCause: z.string().optional(),
  immediateCorrection: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

// GET /api/ncr
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;

    const where = {
      organizationId, // ← org isolation
      ...(status && { status: status as NcrStatusLiteral }),
      ...(type && { type: type as NcrTypeLiteral }),
    };

    try {
      const ncrs = await prisma.nonConformity.findMany({
        where,
        include: { capas: { orderBy: { createdAt: "asc" } } },
        orderBy: { raisedAt: "desc" },
      });

      const now = new Date();
      const openNcrs = ncrs.filter((n) => n.status !== "CLOSED").length;
      const majorOpen = ncrs.filter((n) => n.type === "MAJOR" && n.status !== "CLOSED").length;
      const overdueNcrs = ncrs.filter(
        (n) => n.dueDate && n.dueDate < now && n.status !== "CLOSED"
      ).length;
      const overdueCapas = ncrs.reduce(
        (sum, n) =>
          sum +
          n.capas.filter(
            (c) => c.dueDate && c.dueDate < now && c.status !== "COMPLETED" && c.status !== "VERIFIED"
          ).length,
        0
      );

      const pipeline: Record<NcrStatusLiteral, number> = {
        OPEN: 0,
        UNDER_INVESTIGATION: 0,
        CAPA_ASSIGNED: 0,
        PENDING_VERIFICATION: 0,
        CLOSED: 0,
      };
      ncrs.forEach((n) => { pipeline[n.status] += 1; });

      return ok({
        ncrs,
        stats: { openNcrs, majorOpen, overdueNcrs, overdueCapas, pipeline },
      });
    } catch (dbErr) {
      // New table may not exist yet on a stale DB — return empty gracefully
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation")) {
        return ok({
          ncrs: [],
          stats: {
            openNcrs: 0,
            majorOpen: 0,
            overdueNcrs: 0,
            overdueCapas: 0,
            pipeline: { OPEN: 0, UNDER_INVESTIGATION: 0, CAPA_ASSIGNED: 0, PENDING_VERIFICATION: 0, CLOSED: 0 },
          },
        });
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/ncr
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const parsed = CreateNcrSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { raisedAt, dueDate, ...rest } = parsed.data;

    // Auto-generate a sequential, org-scoped NCR reference: NCR-<year>-<seq>
    const year = new Date().getFullYear();
    const count = await prisma.nonConformity.count({ where: { organizationId } });
    const ncrRef = `NCR-${year}-${String(count + 1).padStart(3, "0")}`;

    const ncr = await prisma.nonConformity.create({
      data: {
        ...rest,
        ncrRef,
        organizationId, // ← org isolation
        raisedAt: raisedAt ? new Date(raisedAt) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { capas: { orderBy: { createdAt: "asc" } } },
    });

    return created(ncr);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
