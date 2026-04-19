"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, User, Mail, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthResponse } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { addNotification } = useUIStore();

  // Step 1: personal info | Step 2: organization info
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    orgName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email) e.email = "Work email is required";
    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
      e.password = "Must include uppercase, lowercase, number and special character";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!form.orgName.trim() || form.orgName.trim().length < 2)
      e.orgName = "Organization name must be at least 2 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          department: form.department || undefined,
          orgName: form.orgName,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Registration failed", message: json.error });
        return;
      }

      // New flow: email verification required before login
      if (json.data?.requiresEmailVerification) {
        setRegisteredEmail(json.data.email ?? form.email);
        setEmailSent(true);
        return;
      }

      // Fallback: legacy direct login (invite path)
      const { token, user } = json.data as AuthResponse;
      if (token && user) {
        setAuth(token, user as never);
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        addNotification({
          type: "success",
          title: "Welcome!",
          message: `${form.orgName} workspace created. 14-day trial started.`,
        });
        window.location.href = "/models";
      }
    } catch {
      addNotification({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  // ── Email verification sent screen ────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-8 shadow-sm space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Check your email</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a verification link to{" "}
              <span className="font-semibold text-foreground">{registeredEmail}</span>.
              <br /><br />
              Click the link in the email to activate your account and sign in.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
              <Mail className="h-4 w-4" />
              Check spam / junk folder if you don&apos;t see it within 2 minutes
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">AI Governance</h1>
          <p className="text-muted-foreground text-sm">Start your 14-day free trial</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 flex-1 ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 1 ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">Your Info</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className={`flex items-center gap-2 flex-1 justify-end ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === 2 ? "border-primary bg-primary text-white" : "border-muted-foreground"}`}>
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-medium">Organization</span>
          </div>
        </div>

        <Card>
          {step === 1 ? (
            <>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>You&apos;ll become the Owner of your organization.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={goToStep2} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Jane Doe" {...field("name")} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" placeholder="jane@company.com" {...field("email")} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department (optional)</Label>
                    <Input id="department" placeholder="Risk & Compliance" {...field("department")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min 8 chars with upper/lower/number/symbol"
                      {...field("password")}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="Repeat password" {...field("confirmPassword")} />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full">Continue →</Button>
                </form>
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Name your organization</CardTitle>
                <CardDescription>This is your company or team workspace name.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      placeholder="Acme Corp AI Division"
                      {...field("orgName")}
                      autoFocus
                    />
                    {errors.orgName && <p className="text-xs text-destructive">{errors.orgName}</p>}
                    <p className="text-xs text-muted-foreground">
                      This will be your workspace URL slug (e.g. acme-corp-ai-division).
                    </p>
                  </div>

                  <div className="p-3 bg-primary/5 rounded-lg text-sm space-y-1 border border-primary/20">
                    <p className="font-medium text-primary">14-day free trial — no credit card required</p>
                    <p className="text-muted-foreground text-xs">Up to 5 users · 10 AI models · DPDP + ISO 42001</p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      ← Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? "Creating..." : "Create Workspace"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
