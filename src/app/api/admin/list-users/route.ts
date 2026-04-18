import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Temporary endpoint — returns all users + allows resetting admin@governance.ai
// Protected by a static secret. Delete this file after use.
const SECRET = "gTower2026Reset!";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await withRetry(() =>
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            isActive: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  return NextResponse.json({ users });
}

// POST ?secret=... — ensure admin@governance.ai exists with org membership
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash("Admin@1234!", 10);

  // Upsert the admin user
  const admin = await withRetry(() =>
    prisma.user.upsert({
      where: { email: "admin@governance.ai" },
      update: { passwordHash, isActive: true },
      create: {
        email: "admin@governance.ai",
        name: "Platform Admin",
        passwordHash,
        role: "ADMIN",
        department: "IT & Governance",
        isActive: true,
      },
    })
  );

  // Find or create org
  let org = await prisma.organization.findFirst({
    where: { slug: "governance-ai" },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "AI Governance Corp",
        slug: "governance-ai",
        plan: "ENTERPRISE",
        isActive: true,
      },
    });
  }

  // Upsert membership
  const existing = await prisma.orgMember.findUnique({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
  });

  if (!existing) {
    await prisma.orgMember.create({
      data: {
        userId: admin.id,
        organizationId: org.id,
        role: "OWNER",
        isActive: true,
      },
    });
  } else {
    await prisma.orgMember.update({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
      data: { role: "OWNER", isActive: true },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "admin@governance.ai is ready",
    email: "admin@governance.ai",
    password: "Admin@1234!",
    org: org.name,
  });
}
