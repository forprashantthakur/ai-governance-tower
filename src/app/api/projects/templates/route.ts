import { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";
import { BUILT_IN_TEMPLATES } from "@/lib/project-templates";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest) => {
  try {
    // Seed if needed
    const count = await prisma.projectTemplate.count({ where: { isBuiltIn: true } });
    if (count === 0) {
      await prisma.projectTemplate.createMany({
        data: BUILT_IN_TEMPLATES.map((t) => ({
          name: t.name,
          description: t.description,
          category: t.category,
          scaffold: t.scaffold as object,
          isBuiltIn: true,
        })),
      });
    }

    const templates = await withRetry(() =>
      prisma.projectTemplate.findMany({ orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }] })
    );

    return ok(templates);
  } catch (err) {
    return serverError(err);
  }
});
