"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PlayCircle, CheckCircle2, Building2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/types";

interface DemoStatusResponse {
  exists: boolean;
  seeded: boolean;
  organizationId: string | null;
  organizationName: string | null;
  moduleCounts: Record<string, number> | null;
}

interface DemoSeedResponse {
  token: string;
  user: AuthUser;
  organizationId: string;
  organizationName: string;
  counts: Record<string, unknown>;
}

/**
 * One-click CIO demo entry point. Seeds (or re-enters) a fully-populated,
 * story-consistent demo bank into a SEPARATE organization — the calling
 * admin's own tenant is never touched. Clicking mints a token scoped to the
 * demo org and reloads into it; signing out and back in returns the user to
 * their normal organization.
 */
export function DemoSeedButton() {
  const { get, post } = useApi();
  const { setAuth } = useAuthStore();
  const { addNotification } = useUIStore();

  const [status, setStatus] = useState<DemoStatusResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [entering, setEntering] = useState(false);

  const loadStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await get<DemoStatusResponse>("/demo/status");
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, [get]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleEnterDemo() {
    setEntering(true);
    try {
      const res = await post<DemoSeedResponse>("/demo/seed", {});
      setAuth(res.token, res.user);
      if (typeof document !== "undefined") {
        document.cookie = `auth_token=${res.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      addNotification({
        type: "success",
        title: "Demo workspace ready",
        message: `Entering "${res.organizationName}" — sign out and back in to return to your own organization.`,
      });
      window.location.href = "/";
    } catch {
      // useApi already surfaced an error toast.
      setEntering(false);
    }
  }

  const seeded = status?.seeded ?? false;
  const busy = entering;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">CIO Walkthrough Demo</p>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
              {checking
                ? "Checking demo workspace status…"
                : seeded
                ? "A fully-populated demo bank is ready in a separate organization. Your own organization's data is never touched."
                : "Populate a separate demo organization with a complete, story-consistent governance programme — one click, no impact on your real organization."}
            </p>
          </div>
        </div>
        <Button onClick={handleEnterDemo} disabled={checking || busy} className="shrink-0">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {seeded ? "Entering demo…" : "Loading demo data…"}
            </>
          ) : seeded ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Demo data loaded — enter demo workspace
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-2" />
              Load CIO Demo Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
