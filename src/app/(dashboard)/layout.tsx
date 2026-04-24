"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const { setAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    try {
      // Directly read from localStorage — bypasses Zustand async hydration
      const stored = localStorage.getItem("ai-governance-auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        const user = parsed?.state?.user;
        if (token && user) {
          // Re-sync Zustand store from localStorage
          setAuth(token, user);
          setAuthenticated(true);
          setReady(true);
          return;
        }
      }
    } catch {}

    // No valid token found — redirect to login
    setReady(true);
    setAuthenticated(false);
    window.location.href = "/login";
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Loading" className="h-12 object-contain animate-pulse" />
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
