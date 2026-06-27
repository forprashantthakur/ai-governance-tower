import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { razorpay, PLAN_CONFIG } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}));
  const { plan } = body as { plan?: string };

  if (!plan || !(plan in PLAN_CONFIG)) {
    return badRequest("Invalid plan. Must be STARTER or PROFESSIONAL.");
  }

  const config = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

  try {
    const receipt = `org_${user.organizationId}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: config.amountPaise,
      currency: "INR",
      receipt,
      notes: {
        organizationId: String(user.organizationId),
        plan: String(plan),
        userId: String(user.id),
      },
    });

    await prisma.payment.create({
      data: {
        organizationId: user.organizationId,
        razorpayOrderId: order.id,
        plan: plan as "STARTER" | "PROFESSIONAL",
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
});
