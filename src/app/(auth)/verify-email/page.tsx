"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "already_verified";

// Inner component — uses useSearchParams(), must be inside <Suspense>
function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please use the link from your email.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          const errMsg: string = json.error ?? "Verification failed.";
          if (errMsg.toLowerCase().includes("already verified")) {
            setStatus("already_verified");
          } else {
            setStatus("error");
          }
          setMessage(errMsg);
          return;
        }

        setStatus("success");

        // Auto-login if token returned
        if (json.data?.token && json.data?.user) {
          setAuth(json.data.token, json.data.user);
          document.cookie = `auth_token=${json.data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          setTimeout(() => {
            window.location.href = "/models";
          }, 2000);
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    }

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      {/* Status card */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
            <p className="text-lg font-semibold">Verifying your email…</p>
            <p className="text-sm text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-green-600">Email Verified!</p>
            <p className="text-sm text-muted-foreground">
              Your account is active. Redirecting you to the dashboard…
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Taking you in…
            </div>
          </>
        )}

        {status === "already_verified" && (
          <>
            <CheckCircle className="h-12 w-12 text-blue-500 mx-auto" />
            <p className="text-lg font-semibold">Already Verified</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button className="w-full" onClick={() => (window.location.href = "/login")}>
              Sign In
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-semibold text-destructive">Verification Failed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Button className="w-full" onClick={() => (window.location.href = "/register")}>
                Register Again
              </Button>
              <Button variant="outline" className="w-full" onClick={() => (window.location.href = "/login")}>
                Back to Sign In
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Help text */}
      {(status === "error" || status === "loading") && (
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Mail className="h-3 w-3" />
          Check your inbox for the verification email from noreply@aigovernancetower.com
        </p>
      )}
    </>
  );
}

// Page wrapper — provides Suspense boundary required by useSearchParams()
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Branding */}
        <div className="flex justify-center">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Shield className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">AI Governance Tower</h1>

        <Suspense
          fallback={
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <p className="text-lg font-semibold">Loading…</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
