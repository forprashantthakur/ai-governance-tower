"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Zap, Building2, Rocket, CheckCircle2,
  Users, BrainCircuit, Shield, AlertTriangle, ArrowRight,
  Clock, Star, Sparkles, Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

// ─── Plan definitions ────────────────────────────────────────────────────────
type PlanKey = "TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

interface PlanDef {
  key: PlanKey;
  name: string;
  tagline: string;
  price: number | null;        // null = custom
  priceLabel: string;
  period: string;
  gstNote: string;
  color: string;
  accent: string;
  icon: React.ElementType;
  maxUsers: number | string;
  maxModels: number | string;
  highlight?: boolean;
  cta: string;
  features: string[];
  badge?: string;
}

const PLANS: PlanDef[] = [
  {
    key: "TRIAL",
    name: "Trial",
    tagline: "Explore the platform",
    price: 0,
    priceLabel: "₹0",
    period: "14 days",
    gstNote: "No credit card required",
    color: "border-border",
    accent: "text-muted-foreground",
    icon: Clock,
    maxUsers: 5,
    maxModels: 10,
    cta: "Current Plan",
    features: [
      "Up to 5 users",
      "Up to 10 AI models",
      "DPDP Act compliance controls",
      "Basic risk scoring",
      "Consent management",
      "Community support",
    ],
  },
  {
    key: "STARTER",
    name: "Starter",
    tagline: "For fintechs & NBFCs",
    price: 12711,
    priceLabel: "₹12,711",
    period: "per month",
    gstNote: "+ 18% GST  •  ₹14,999 incl. GST",
    color: "border-blue-500/40",
    accent: "text-blue-400",
    icon: Rocket,
    maxUsers: 10,
    maxModels: 25,
    cta: "Upgrade to Starter",
    features: [
      "Up to 10 users",
      "Up to 25 AI models",
      "DPDP Act + ISO 42001 controls",
      "Automated risk scoring",
      "Consent & data governance",
      "Compliance reports (PDF)",
      "Email support (48h SLA)",
      "Audit logs (90 days)",
    ],
  },
  {
    key: "PROFESSIONAL",
    name: "Professional",
    tagline: "For banks & insurers",
    price: 38135,
    priceLabel: "₹38,135",
    period: "per month",
    gstNote: "+ 18% GST  •  ₹44,999 incl. GST",
    color: "border-primary",
    accent: "text-primary",
    icon: Shield,
    maxUsers: 25,
    maxModels: 100,
    highlight: true,
    badge: "Most Popular",
    cta: "Upgrade to Professional",
    features: [
      "Up to 25 users",
      "Up to 100 AI models",
      "All frameworks: DPDP, ISO 42001, EU AI Act, RBI, SEBI, IRDAI",
      "AI Agent governance (up to 10 agents)",
      "Bias & fairness testing module",
      "ISO 42005 impact assessments",
      "n8n workflow automation",
      "Priority support (24h SLA)",
      "Audit logs (1 year)",
      "Custom branding",
      "SSO / SAML integration",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For PSBs & large institutions",
    price: null,
    priceLabel: "Custom",
    period: "per year",
    gstNote: "Volume discounts available",
    color: "border-amber-500/40",
    accent: "text-amber-400",
    icon: Building2,
    maxUsers: "Unlimited",
    maxModels: "Unlimited",
    cta: "Contact Sales",
    badge: "Best Value",
    features: [
      "Unlimited users & AI models",
      "On-premise / private cloud deployment",
      "All Professional features",
      "Dedicated Customer Success Manager",
      "99.9% uptime SLA",
      "Custom compliance frameworks",
      "API access & webhooks",
      "White-label option",
      "Regulatory audit support",
      "4-hour critical support SLA",
      "On-site training & workshops",
    ],
  },
];

// ─── Usage bar ────────────────────────────────────────────────────────────────
function UsageBar({ used, max, label }: { used: number; max: number | string; label: string }) {
  const pct = typeof max === "number" ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={cn(danger && "text-destructive", warn && !danger && "text-amber-400")}>
          {used} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            danger ? "bg-destructive" : warn ? "bg-amber-400" : "bg-primary"
          )}
          style={{ width: typeof max === "number" ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
}: {
  plan: PlanDef;
  isCurrent: boolean;
  onUpgrade: (key: PlanKey) => void;
}) {
  const Icon = plan.icon;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6 transition-all",
        plan.highlight
          ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
          : plan.color,
        isCurrent && "ring-2 ring-primary/30"
      )}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={cn("flex items-center gap-2 mb-1", plan.accent)}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-wide">{plan.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{plan.tagline}</p>
        </div>
        {isCurrent && (
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        )}
      </div>

      {/* Price */}
      <div className="mb-1">
        <span className="text-3xl font-bold">{plan.priceLabel}</span>
        {plan.price !== null && (
          <span className="text-sm text-muted-foreground ml-1">/{plan.period}</span>
        )}
        {plan.price === null && (
          <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-5">{plan.gstNote}</p>

      {/* CTA */}
      <button
        onClick={() => !isCurrent && onUpgrade(plan.key)}
        disabled={isCurrent}
        className={cn(
          "w-full py-2 rounded-lg text-sm font-semibold transition-all mb-5",
          isCurrent
            ? "bg-muted text-muted-foreground cursor-default"
            : plan.highlight
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            : "border border-border hover:bg-accent text-foreground"
        )}
      >
        {isCurrent ? "Your current plan" : plan.cta}
      </button>

      {/* Limits */}
      <div className="grid grid-cols-2 gap-2 mb-5 p-3 bg-muted/40 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
            <Users className="h-3 w-3" /> Users
          </div>
          <div className="text-sm font-bold">{plan.maxUsers}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
            <BrainCircuit className="h-3 w-3" /> Models
          </div>
          <div className="text-sm font-bold">{plan.maxModels}</div>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { user } = useAuthStore();
  const currentPlan = (user?.plan ?? "TRIAL") as PlanKey;

  const [orgUsage, setOrgUsage] = useState<{
    models: number; maxModels: number;
    members: number; maxUsers: number;
    plan: string; planExpiresAt: string | null;
  } | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState<PlanKey | null>(null);
  const [annual, setAnnual] = useState(false);

  // Fetch org usage from /api/organizations
  useEffect(() => {
    fetch("/api/organizations", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrgUsage(data.data);
      })
      .catch(() => {});
  }, []);

  function handleUpgrade(key: PlanKey) {
    if (key === "ENTERPRISE") {
      window.open("mailto:prashant@aigovernancetower.com?subject=Enterprise Plan Enquiry", "_blank");
      return;
    }
    setShowUpgradeModal(key);
  }

  const currentDef = PLANS.find((p) => p.key === currentPlan) ?? PLANS[0];
  const trialDaysLeft = orgUsage?.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(orgUsage.planExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="min-h-screen bg-background p-6 space-y-8 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your plan, usage limits, and billing details
        </p>
      </div>

      {/* ── Current plan summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Plan status */}
        <div className="md:col-span-2 rounded-xl border bg-card p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <currentDef.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg">{currentDef.name} Plan</span>
              {currentPlan === "TRIAL" && trialDaysLeft !== null && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  trialDaysLeft <= 3 ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-400"
                )}>
                  {trialDaysLeft > 0 ? `${trialDaysLeft} days left` : "Expired"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{currentDef.tagline}</p>

            {currentPlan === "TRIAL" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Your trial {trialDaysLeft === 0 ? "has expired" : `expires in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`}.
                Upgrade to continue accessing all features.
              </div>
            )}
          </div>
          {currentPlan !== "ENTERPRISE" && (
            <button
              onClick={() => {
                const next = PLANS[PLANS.findIndex((p) => p.key === currentPlan) + 1];
                if (next) handleUpgrade(next.key);
              }}
              className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Upgrade <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Usage */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Current Usage</h3>
          {orgUsage ? (
            <>
              <UsageBar used={orgUsage.members} max={orgUsage.maxUsers} label="Team members" />
              <UsageBar used={orgUsage.models} max={orgUsage.maxModels} label="AI models" />
            </>
          ) : (
            <div className="text-xs text-muted-foreground animate-pulse">Loading usage…</div>
          )}
        </div>
      </div>

      {/* ── Annual toggle ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Choose a Plan</h2>
        <div className="flex items-center gap-3 text-sm">
          <span className={cn(!annual && "font-semibold")}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              annual ? "bg-primary" : "bg-muted"
            )}
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow",
              annual && "translate-x-5"
            )} />
          </button>
          <span className={cn(annual && "font-semibold")}>
            Annual
            <span className="ml-1.5 text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {PLANS.map((plan) => {
          const displayPlan: PlanDef = annual && plan.price !== null && plan.price > 0
            ? { ...plan, priceLabel: `₹${Math.round(plan.price * 0.8).toLocaleString("en-IN")}`, gstNote: `+ 18% GST  •  Annual billing` }
            : plan;
          return (
            <PlanCard
              key={plan.key}
              plan={displayPlan}
              isCurrent={plan.key === currentPlan}
              onUpgrade={handleUpgrade}
            />
          );
        })}
      </div>

      {/* ── Payment note ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
        <div>
          <span className="font-medium text-foreground">Secure payments via Razorpay</span>
          {" "}— All transactions are encrypted. Accepted: UPI, NetBanking, Credit/Debit cards, NEFT/RTGS.
          GST invoice generated automatically for Indian businesses.{" "}
          <a href="mailto:billing@aigovernancetower.com" className="text-primary hover:underline">
            billing@aigovernancetower.com
          </a>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { q: "Can I upgrade or downgrade at any time?", a: "Yes. Upgrades are effective immediately with pro-rata billing. Downgrades take effect at the next billing cycle." },
            { q: "What happens when my trial expires?", a: "Your data is preserved for 30 days. You can export it anytime. Upgrading restores full access instantly." },
            { q: "Do you offer a BFSI-specific discount?", a: "Yes — NBFCs, cooperative banks and insurance companies get 15% off. Contact sales with your RBI/IRDAI registration." },
            { q: "Is on-premise deployment available?", a: "Yes on the Enterprise plan. We support AWS, Azure, GCP and bare-metal deployments on Indian data centres." },
            { q: "Can I get a GST invoice?", a: "Yes. Add your GSTIN in Settings → Organisation and all invoices will include a valid GST tax invoice." },
            { q: "Is there a free tier?", a: "The 14-day trial is fully featured. After that, contact us — we have a limited free tier for academic/research institutions." },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-lg border bg-card p-4">
              <p className="text-sm font-medium mb-1">{q}</p>
              <p className="text-xs text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upgrade modal (Razorpay coming soon) ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  Upgrade to {PLANS.find((p) => p.key === showUpgradeModal)?.name}
                </h3>
                <p className="text-xs text-muted-foreground">Online payments launching soon</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Razorpay integration is being activated. To upgrade immediately, contact us and we&apos;ll
              provision your plan within 2 business hours.
            </p>

            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>WhatsApp: <a href="https://wa.me/919XXXXXXXXX" className="text-primary">+91-9XX-XXX-XXXX</a></span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Email: <a href="mailto:sales@aigovernancetower.com" className="text-primary">sales@aigovernancetower.com</a></span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(null)}
                className="flex-1 py-2 rounded-lg border text-sm hover:bg-accent transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:sales@aigovernancetower.com?subject=Upgrade to ${PLANS.find((p) => p.key === showUpgradeModal)?.name} Plan`}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold text-center hover:bg-primary/90 transition-colors"
              >
                Email Sales
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
