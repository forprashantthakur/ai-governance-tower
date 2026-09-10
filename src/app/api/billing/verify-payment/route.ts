import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { verifyRazorpaySignature, PLAN_CONFIG } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return badRequest("Missing required payment fields.");
  }

  // Verify HMAC-SHA256 signature — reject immediately on mismatch
  const valid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  if (!valid) {
    return badRequest("Payment verification failed: invalid signature.");
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!payment) {
    return badRequest("Order not found.");
  }

  if (payment.organizationId !== user.organizationId) {
    return badRequest("Order does not belong to your organization.");
  }

  // Idempotent — already captured means success
  if (payment.status === "CAPTURED") {
    return ok({ message: "Payment already verified.", plan: payment.plan });
  }

  const config = PLAN_CONFIG[payment.plan as keyof typeof PLAN_CONFIG];
  if (!config) {
    return serverError(new Error("Unknown plan in payment record"));
  }

  const planExpiresAt = new Date();
  planExpiresAt.setDate(planExpiresAt.getDate() + config.planExpiryDays);

  try {
    await prisma.$transaction([
      prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "CAPTURED",
        },
      }),
      prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          plan: payment.plan,
          planExpiresAt,
          maxUsers: config.maxUsers,
          maxModels: config.maxModels,
        },
      }),
    ]);

    return ok({
      message: "Payment verified. Plan upgraded successfully.",
      plan: payment.plan,
      planExpiresAt,
    });
  } catch (err) {
    return serverError(err);
  }
});
