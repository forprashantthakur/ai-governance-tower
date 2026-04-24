"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuthResponse, OrgInfo, OrgMemberRole } from "@/types";

type OrgOption = OrgInfo & { role: OrgMemberRole };

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const { addNotification } = useUIStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Org picker state (user belongs to multiple orgs)
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [showOrgPicker, setShowOrgPicker] = useState(false);

  async function doLogin(extraPayload?: { organizationId: string }) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...extraPayload }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Login failed", message: json.error });
        return;
      }

      const data = json.data as AuthResponse;

      // Multi-org: ask user to pick
      if (data.requiresOrgPicker && data.organizations) {
        setPendingUser(data.user as never);
        setOrgOptions(data.organizations as OrgOption[]);
        setShowOrgPicker(true);
        return;
      }

      // No org yet — redirect to register
      if (data.requiresOrgSetup) {
        addNotification({ type: "warning", title: "No organization", message: "Please create a workspace first." });
        window.location.href = "/register";
        return;
      }

      if (data.token && data.user) {
        setAuth(data.token, data.user as never);
        document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        window.location.href = "/";
      }
    } catch {
      addNotification({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = "Email is required";
    if (!form.password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    await doLogin();
  }

  async function selectOrg(orgId: string) {
    setShowOrgPicker(false);
    await doLogin({ organizationId: orgId });
  }

  // ─── Org Picker screen ─────────────────────────────────────────────────────
  if (showOrgPicker && pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Choose Workspace</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {pendingUser.name}. Select an organization to continue.
            </p>
          </div>

          <div className="space-y-3">
            {orgOptions.map((org) => (
              <button
                key={org.id}
                onClick={() => selectOrg(org.id)}
                disabled={loading}
                className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{org.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs capitalize">{org.role.toLowerCase().replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="text-xs">{org.plan}</Badge>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setShowOrgPicker(false); setPendingUser(null); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  // ─── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src="/logo.png" alt="AI Governance Control Tower" className="h-24 object-contain mx-auto" />
          </div>
          <p className="text-muted-foreground text-sm">Enterprise Edition</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Access your governance dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Start free trial
              </Link>
            </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
