import Razorpay from "razorpay";
import crypto from "crypto";

// Lazy singleton — do NOT instantiate at module level.
// Next.js evaluates API route modules during build; if credentials
// are absent the Razorpay constructor throws and the build fails.
let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_client) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
    }
    _client = new Razorpay({ key_id, key_secret });
  }
  return _client;
}

export interface PlanConfig {
  name: string;
  amountPaise: number;
  maxUsers: number;
  maxModels: number;
  planExpiryDays: number;
}

export const PLAN_CONFIG: Record<"STARTER" | "PROFESSIONAL", PlanConfig> = {
  STARTER: {
    name: "Starter",
    amountPaise: 1499900, // ₹14,999 incl. GST
    maxUsers: 10,
    maxModels: 25,
    planExpiryDays: 30,
  },
  PROFESSIONAL: {
    name: "Professional",
    amountPaise: 4499900, // ₹44,999 incl. GST
    maxUsers: 25,
    maxModels: 100,
    planExpiryDays: 30,
  },
};

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
}
