"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/models": "AI Model Inventory",
  "/risk": "Risk & Compliance Engine",
  "/data-governance": "Data Governance",
  "/agents": "Agent Governance",
  "/monitoring": "Monitoring & Observability",
  "/audit": "Audit & Reports",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const title =
    Object.entries(PAGE_TITLES).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] ?? "AI Governance";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">
          AI Governance Control Tower
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 w-64 h-9 text-sm bg-muted/50"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
        </Button>

        {user && (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
