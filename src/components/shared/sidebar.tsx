"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BrainCircuit,
  ShieldAlert,
  Database,
  Bot,
  Activity,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  FolderKanban,
  FileSearch,
  BarChart3,
  CheckSquare,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderKanban, label: "AI Projects" },
  { href: "/models", icon: BrainCircuit, label: "AI Inventory" },
  { href: "/risk", icon: ShieldAlert, label: "Risk & Compliance" },
  { href: "/iso42005", icon: FileSearch, label: "ISO 42005 Assessment" },
  { href: "/approvals", icon: CheckSquare, label: "Approval Workflows" },
  { href: "/compliance-map", icon: Scale, label: "Regulation Mapping" },
  { href: "/data-governance", icon: Database, label: "Data Governance" },
  { href: "/consent", icon: ShieldCheck, label: "Consent Management" },
  { href: "/agents", icon: Bot, label: "Agent Governance" },
  { href: "/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/audit",   icon: FileText,   label: "Audit Logs" },
  { href: "/reports", icon: BarChart3,  label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 fixed left-0 top-0 z-40",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border h-16">
        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">AI Governance</p>
            <p className="text-xs text-muted-foreground">Control Tower</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={sidebarCollapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border p-2 space-y-1">
        {/* User info */}
        {!sidebarCollapsed && user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.role}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={clearAuth}
          title={sidebarCollapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && "Sign out"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
