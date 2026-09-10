import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";

export const GET = withAuth(async (_req: NextRequest, { user }) => {
  const [org, modelCount, memberCount, lastPayment] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        plan: true,
        planExpiresAt: true,
        maxUsers: true,
        maxModels: true,
        billingEmail: true,
      },
    }),
    prisma.aIModel.count({ where: { organizationId: user.organizationId } }),
    prisma.organizationMember.count({ where: { organizationId: user.organizationId } }),
    prisma.payment.findFirst({
      where: { organizationId: user.organizationId, status: "CAPTURED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return ok({
    plan: org?.plan ?? "TRIAL",
    planExpiresAt: org?.planExpiresAt ?? null,
    maxUsers: org?.maxUsers ?? 5,
    maxModels: org?.maxModels ?? 10,
    billingEmail: org?.billingEmail ?? null,
    usage: { models: modelCount, members: memberCount },
    lastPayment: lastPayment
      ? {
          plan: lastPayment.plan,
          amountPaise: lastPayment.amountPaise,
          createdAt: lastPayment.createdAt,
        }
      : null,
  });
});
