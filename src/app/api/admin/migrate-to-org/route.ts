import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, forbidden, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/migrate-to-org
 *
 * One-time data migration: creates a default Organization for all existing
 * data and backfills organizationId on all tenant-scoped models.
 *
 * Protected by MIGRATE_SECRET env var — never expose this without auth.
 * Run once against production after deploying the schema migration.
 *
 * Body: { secret: string, orgName?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, orgName = "Default Organization" } = body;

    // Guard — require secret that matches env var
    const expectedSecret = process.env.MIGRATE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return forbidden("Invalid migration secret");
    }

    // Check if already migrated (any model with an organizationId)
    const alreadyMigrated = await prisma.aIModel.findFirst({
      where: { organizationId: { not: null } },
    });
    if (alreadyMigrated) {
      return ok({ message: "Already migrated — some records have organizationId set", skipped: true });
    }

    // Count existing data
    const [userCount, modelCount, projectCount, dataAssetCount, agentCount,
           promptLogCount, alertCount, auditLogCount, reportCount, consentCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.aIModel.count(),
        prisma.project.count(),
        prisma.dataAsset.count(),
        prisma.agent.count(),
        prisma.promptLog.count(),
        prisma.alert.count(),
        prisma.auditLog.count(),
        prisma.report.count(),
        prisma.consentRecord.count(),
      ]);

    // Create the default organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: `${slug}-legacy`,
        plan: "STARTER",
        isActive: true,
      },
    });

    // Find the first ADMIN user to be the org owner
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    });

    // Create OrganizationMember entries for all users, preserving their platform roles
    const users = await prisma.user.findMany({
      select: { id: true, role: true },
    });

    const roleMap: Record<string, string> = {
      ADMIN: "ADMIN",
      RISK_OFFICER: "RISK_OFFICER",
      AUDITOR: "AUDITOR",
      VIEWER: "VIEWER",
    };

    // The first admin becomes the OWNER; others get their mapped role
    const memberData = users.map((u) => ({
      organizationId: org.id,
      userId: u.id,
      role: (adminUser?.id === u.id)
        ? "OWNER"
        : (roleMap[u.role as string] ?? "VIEWER"),
    }));

    await prisma.organizationMember.createMany({
      data: memberData as never,
      skipDuplicates: true,
    });

    // Backfill organizationId on all tenant-scoped models using raw SQL for speed
    const updates = await prisma.$transaction([
      prisma.$executeRaw`UPDATE ai_models SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE projects SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE data_assets SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE agents SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE prompt_logs SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE alerts SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE audit_logs SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE reports SET organization_id = ${org.id} WHERE organization_id IS NULL`,
      prisma.$executeRaw`UPDATE consent_records SET organization_id = ${org.id} WHERE organization_id IS NULL`,
    ]);

    return ok({
      message: "Migration complete",
      organization: { id: org.id, name: org.name, slug: org.slug },
      migrated: {
        users: userCount,
        members: memberData.length,
        models: modelCount,
        projects: projectCount,
        dataAssets: dataAssetCount,
        agents: agentCount,
        promptLogs: promptLogCount,
        alerts: alertCount,
        auditLogs: auditLogCount,
        reports: reportCount,
        consentRecords: consentCount,
      },
      rowsUpdated: updates.reduce((s, n) => s + n, 0),
    });
  } catch (err) {
    return serverError(err);
  }
}
