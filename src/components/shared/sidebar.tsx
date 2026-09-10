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
  Sparkles,
  Workflow,
  CreditCard,
  Gauge,
  ScrollText,
  Layers,
  ClipboardList,
  Landmark,
  LineChart,
  SearchCheck,
  FlaskConical,
  AlertOctagon,
  Route,
  GraduationCap,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/",           icon: LayoutDashboard, label: "Dashboard" },
      { href: "/governance", icon: Target,          label: "Governance Programme" },
      { href: "/kri",        icon: Gauge,           label: "Risk KRI Dashboard" },
    ],
  },
  {
    label: "AI Inventory",
    items: [
      { href: "/models",   icon: BrainCircuit, label: "AI Inventory" },
      { href: "/projects", icon: FolderKanban, label: "AI Projects" },
      { href: "/agents",   icon: Bot,          label: "Agent Governance" },
    ],
  },
  {
    label: "Governance Framework",
    items: [
      { href: "/policies", icon: ScrollText,     label: "AI Policy Framework" },
      { href: "/aims",     icon: Layers,         label: "AI Management System" },
      { href: "/soa",      icon: ClipboardList,  label: "Statement of Applicability" },
    ],
  },
  {
    label: "Regulatory Compliance",
    items: [
      { href: "/free-ai",        icon: Landmark,   label: "RBI FREE-AI" },
      { href: "/model-risk",     icon: LineChart,  label: "Model Risk Management" },
      { href: "/compliance-map", icon: Scale,      label: "Regulation Mapping" },
      { href: "/iso42005",       icon: FileSearch, label: "AI Impact Assessment" },
    ],
  },
  {
    label: "Risk & Assurance",
    items: [
      { href: "/risk",            icon: ShieldAlert,   label: "Risk & Compliance" },
      { href: "/gap-assessment",  icon: SearchCheck,   label: "Gap Assessment" },
      { href: "/control-testing", icon: FlaskConical,  label: "Control Testing" },
      { href: "/ncr-capa",        icon: AlertOctagon,  label: "NCR & CAPA" },
      { href: "/remediation",     icon: Route,         label: "Remediation Roadmap" },
      { href: "/approvals",       icon: CheckSquare,   label: "Approval Workflows" },
    ],
  },
  {
    label: "Data & Privacy",
    items: [
      { href: "/data-governance", icon: Database,    label: "Data Governance" },
      { href: "/consent",         icon: ShieldCheck, label: "Consent Management" },
    ],
  },
  {
    label: "Observe & Report",
    items: [
      { href: "/monitoring", icon: Activity,  label: "Monitoring" },
      { href: "/audit",      icon: FileText,  label: "Audit Logs" },
      { href: "/reports",    icon: BarChart3, label: "Reports" },
    ],
  },
  {
    label: "Enablement",
    items: [
      { href: "/training",     icon: GraduationCap, label: "Training & Enablement" },
      { href: "/ai-maturity",  icon: Sparkles,      label: "AI Use Case Finder" },
      { href: "/n8n-builder",  icon: Workflow,      label: "n8n Workflow Builder" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/billing",  icon: CreditCard, label: "Plan & Billing" },
      { href: "/settings", icon: Settings,   label: "Settings" },
    ],
  },
];

/**
 * Longest-prefix match so that nested routes highlight their parent, but
 * sibling routes sharing a prefix (e.g. /model-risk vs /models) never both
 * light up. "/" only matches exactly.
 */
function useActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const group of NAV_GROUPS) {
    for (const { href } of group.items) {
      if (href === "/") {
        if (pathname === "/") return "/";
        continue;
      }
      const matches = pathname === href || pathname.startsWith(`${href}/`);
      if (matches && (best === null || href.length > best.length)) {
        best = href;
      }
    }
  }
  return best;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const activeHref = useActiveHref(pathname);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-card border-r border-border transition-all duration-300 fixed left-0 top-0 z-40",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border h-16 shrink-0">
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
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
            {sidebarCollapsed ? (
              // Collapsed: a hairline separator stands in for the group label
              groupIndex > 0 && <div className="h-px bg-border mx-2 mb-2" />
            ) : (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = activeHref === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={sidebarCollapsed ? label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
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
