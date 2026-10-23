import type { Metadata } from "next";

// The sign-up page is a useful search landing ("free trial"), so it stays indexable.
export const metadata: Metadata = {
  title: "Start a free 14-day trial",
  description:
    "Create your AI Governance Control Tower workspace: AI inventory, risk scoring and ISO 42001, DPDP, RBI FREE-AI and EU AI Act controls. No card required.",
  alternates: { canonical: "/register" },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
