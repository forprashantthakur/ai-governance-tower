"use client";

import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import { CheckCircle2, Zap, Building2, Crown, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BillingStatus {
  plan: string;
  planExpiresAt: string | null;
  maxUsers: number;
  maxModels: number;
  billingEmail: string | null;
  usage: { models: number; members: number };
  lastPayment: { plan: string; amountPaise: number; createdAt: string } | null;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void };
  }
}

const PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    price: "₹14,999",
    priceNote: "incl. 18% GST / mo",
    icon: Zap,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    maxUsers: 10,
    maxModels: 25,
    features: [
      "DPDP Act + ISO 42001 controls",
      "Automated risk scoring",
      "Consent & data governance",
      "Compliance reports (PDF)",
      "Email support (48h SLA)",
      "Audit logs — 90 days",
    ],
  },
  {
    key: "PROFESSIONAL",
    name: "Professional",
    price: "₹44,999",
    priceNote: "incl. 18% GST / mo",
    icon: Crown,
    color: "text-violet-600",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-300 dark:border-violet-700",
    maxUsers: 25,
    maxModels: 100,
    popular: true,
    features: [
      "All frameworks: DPDP, ISO 42001, RBI, SEBI, IRDAI, EU AI Act",
      "AI Agent governance (10 agents)",
      "Bias & fairness testing module",
      "ISO 42005 impact assessments",
      "n8n workflow automation",
      "Priority support (24h SLA)",
      "Audit logs — 1 year",
      "SSO / SAML integration",
    ],
  },
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setStatus(json.data);
      else setFetchError(true);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleUpgrade = async (planKey: string) => {
    setLoadingPlan(planKey);
    try {
      const token = localStorage.getItem("auth_token");

      // Step 1: Create order on server
      const orderRes = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson.success) {
        addNotification({ type: "error", title: "Error", message: orderJson.error ?? "Failed to create order." });
        return;
      }

      const { orderId, amount, currency, planName } = orderJson.data;

      // Step 2: Open Razorpay Checkout modal
      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount,
        currency,
        name: "AI Governance Control Tower",
        description: `${planName} Plan — Monthly`,
        order_id: orderId,
        prefill: {
          name: user?.name ?? "",
          email: user?.email ?? "",
        },
        theme: { color: "#0f172a" },
        handler: async (response) => {
          // Step 3: Verify payment on server
          const verifyRes = await fetch("/api/billing/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            addNotification({
              type: "success",
              title: "Plan upgraded!",
              message: `You are now on the ${planName} plan.`,
            });
            fetchStatus();
          } else {
            addNotification({
              type: "error",
              title: "Verification failed",
              message: verifyJson.error ?? "Could not verify payment.",
            });
          }
        },
        modal: {
          ondismiss: () => {
            addNotification({ type: "warning", title: "Payment cancelled", message: "No charge was made." });
          },
        },
      });

      rzp.open();
    } catch (err) {
      addNotification({ type: "error", title: "Error", message: "Something went wrong. Please try again." });
      console.error("[billing] handleUpgrade:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlan = status?.plan ?? "TRIAL";
  const isActivePlan = (key: string) => currentPlan === key;
  const isPaidPlan = currentPlan !== "TRIAL" && currentPlan !== "ENTERPRISE";

  return (
    <>
      {/* Razorpay Checkout script */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Plan &amp; Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing information.
          </p>
        </div>

        {/* Current plan summary */}
        {status && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={currentPlan === "TRIAL" ? "secondary" : "default"}>
                    {currentPlan}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI Models</p>
                <p className="font-semibold mt-1">
                  {status.usage.models} / {status.maxModels}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="font-semibold mt-1">
                  {status.usage.members} / {status.maxUsers}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isPaidPlan ? "Renews" : "Trial expires"}
                </p>
                <p className="font-semibold mt-1 text-sm">
                  {status.planExpiresAt
                    ? new Date(status.planExpiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {fetchError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Could not load billing information. Please refresh.
          </div>
        )}

        {/* Plan cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const active = isActivePlan(plan.key);
              const isLoading = loadingPlan === plan.key;

              return (
                <Card
                  key={plan.key}
                  className={`relative ${plan.popular ? `border-2 ${plan.border}` : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-violet-600 text-white text-xs px-3">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${plan.bg}`}>
                        <Icon className={`h-5 w-5 ${plan.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <CardDescription>
                          {plan.maxUsers} users · {plan.maxModels} AI models
                        </CardDescription>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">
                        {plan.priceNote}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {active ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(plan.key)}
                        disabled={isLoading || loadingPlan !== null}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Opening checkout…
                          </>
                        ) : currentPlan === "TRIAL" ? (
                          `Upgrade to ${plan.name}`
                        ) : (
                          `Switch to ${plan.name}`
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Enterprise */}
        <Card className="border-dashed">
          <CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <Building2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold">Enterprise</p>
                <p className="text-sm text-muted-foreground">
                  Unlimited users &amp; models · On-premise · Custom SLAs · White-label
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:billing@aigovernancetower.com">Contact Sales</a>
            </Button>
          </CardContent>
        </Card>

        {/* Last payment */}
        {status?.lastPayment && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Last Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{status.lastPayment.plan} Plan</span>
                <span className="text-muted-foreground ml-2">
                  — ₹{(status.lastPayment.amountPaise / 100).toLocaleString("en-IN")} incl. GST
                </span>
              </div>
              <span className="text-muted-foreground">
                {new Date(status.lastPayment.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
