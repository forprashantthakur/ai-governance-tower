"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, Mail, CheckCircle2, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuthResponse } from "@/types";

interface InviteInfo {
  email: string;
  role: string;
  organization: { name: string; plan: string };
  expiresAt: string;
  status: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { addNotification } = useUIStore();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch invite info on mount
  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/invite-info?token=${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInviteInfo(json.data);
        else setInviteError(json.error ?? "Invalid or expired invite link");
      })
      .catch(() => setInviteError("Failed to load invite details"))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.password || form.password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(form.password))
      errs.password = "Must include uppercase, lowercase, number and special character";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token, name: form.name, password: form.password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        addNotification({ type: "error", title: "Failed to accept invite", message: json.error });
        return;
      }

      const { token: authToken, user } = json.data as AuthResponse;
      if (authToken && user) {
        setAuth(authToken, user as never);
        document.cookie = `auth_token=${authToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        addNotification({
          type: "success",
          title: "Welcome!",
          message: `You've joined ${inviteInfo?.organization.name ?? "the organization"}.`,
        });
        window.location.href = "/";
      }
    } catch {
      addNotification({ type: "error", title: "Network error", message: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading invite details…</p>
      </div>
    );
  }

  if (inviteError || !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="font-semibold text-lg">Invite unavailable</p>
            <p className="text-muted-foreground text-sm">{inviteError}</p>
            <Button variant="outline" onClick={() => router.push("/login")}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Shield className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">You&apos;re invited</h1>
          <p className="text-muted-foreground text-sm">Accept your invitation to join the governance platform</p>
        </div>

        {/* Invite summary */}
        <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Invited email:</span>
            <span className="font-medium">{inviteInfo.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Organization:</span>
            <span className="font-medium">{inviteInfo.organization.name}</span>
            <Badge variant="outline" className="text-xs">{inviteInfo.organization.plan}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your role:</span>
            <Badge className="text-xs capitalize">{inviteInfo.role.toLowerCase().replace("_", " ")}</Badge>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set up your account</CardTitle>
            <CardDescription>Complete your profile to accept the invite.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 chars with upper/lower/number/symbol"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Joining..." : `Join ${inviteInfo.organization.name}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
