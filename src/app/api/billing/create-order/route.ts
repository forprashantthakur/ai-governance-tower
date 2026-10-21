import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { randomBytes } from "crypto";
import { getRazorpay, PLAN_CONFIG, PLAN_RANK, isPaidPlan } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}));
  const { plan } = body as { plan?: string };

  if (!isPaidPlan(plan)) {
    return badRequest("Invalid plan. Must be STARTER or PROFESSIONAL.");
  }

  const config = PLAN_CONFIG[plan];

  try {
    // Don't let an active higher plan be replaced by a cheaper one.
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true, planExpiresAt: true },
    });
    const active = !org?.planExpiresAt || org.planExpiresAt > new Date();
    if (org && active && (PLAN_RANK[org.plan] ?? 0) > PLAN_RANK[plan]) {
      return badRequest(`Your organization is already on the ${org.plan} plan.`);
    }

    // Razorpay receipts are limited to 40 characters and should be unique.
    const receipt = `rcpt_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;

    const order = await getRazorpay().orders.create({
      amount: config.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        organizationId: String(user.organizationId),
        plan: String(plan),
        userId: String(user.userId),
      },
    });

    await prisma.payment.create({
      data: {
        organizationId: user.organizationId,
        razorpayOrderId: order.id,
        plan,
        amountPaise: config.amountPaise,
        status: "CREATED",
      },
    });

    return ok({
      orderId: order.id,
      amount: config.amountPaise,
      currency: "INR",
      planName: config.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
