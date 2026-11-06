"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const { setAuth, clearAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // The session lives in an HttpOnly cookie the page can't read, so ask the
    // server who is signed in. Cached display data lets the page render at once
    // while the check runs.
    let cancelled = false;
    let hadCache = false;
    try {
      const cached = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}")?.state?.user;
      if (cached) {
        hadCache = true;
        setAuthenticated(true);
        setReady(true);
      }
    } catch {}

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        const json = res.ok ? await res.json() : null;
        if (json?.success && json.data) {
          const me = json.data;
          setAuth({ ...me, orgRole: me.role, plan: me.organization?.plan });
          setAuthenticated(true);
          setReady(true);
          return;
        }
        if (res.status === 401) {
          clearAuth();
          window.location.href = "/login";
          return;
        }
        // Server or network trouble: keep cached details if we have them.
        if (!hadCache) window.location.href = "/login";
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (!hadCache) window.location.href = "/login";
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setAuth, clearAuth]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <Header />
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
