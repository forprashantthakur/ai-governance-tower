"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListChecks, Plus, RefreshCw, Search, Filter, X, ChevronDown, Loader2,
  AlertTriangle, CheckCircle2, Clock, Ban, Link2, Calendar, User, Layers,
  Map, LayoutGrid, Trash2, Target, Gauge,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/shared/stat-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = "P1" | "P2" | "P3" | "P4";
type Status = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "DEFERRED";
type Horizon = "QUICK_WIN" | "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";
type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "danger" | "info" | "purple";

interface RemediationItem {
  id: string;
  itemRef: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: Status;
  horizon: Horizon;
  workstream: string | null;
  framework: string | null;
  sourceRef: string | null;
  ownerRole: string | null;
  effortDays: number;
  progressPct: number;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  overallProgress: number;
  p1Open: number;
}

interface RemediationResponse {
  rows: RemediationItem[];
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; badge: BadgeVariant }> = {
  P1: { label: "P1 · Critical", badge: "danger" },
  P2: { label: "P2 · High", badge: "warning" },
  P3: { label: "P3 · Medium", badge: "info" },
  P4: { label: "P4 · Low", badge: "secondary" },
};

const STATUS_CONFIG: Record<Status, { label: string; badge: BadgeVariant; icon: React.ReactNode }> = {
  NOT_STARTED: { label: "Not Started", badge: "secondary", icon: <Clock className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In Progress", badge: "warning", icon: <Loader2 className="h-3 w-3" /> },
  BLOCKED: { label: "Blocked", badge: "danger", icon: <Ban className="h-3 w-3" /> },
  COMPLETED: { label: "Completed", badge: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  DEFERRED: { label: "Deferred", badge: "purple", icon: <Clock className="h-3 w-3" /> },
};

const HORIZON_CONFIG: Record<Horizon, { label: string; window: string }> = {
  QUICK_WIN: { label: "Quick Wins", window: "0–3 months" },
  SHORT_TERM: { label: "Short Term", window: "3–6 months" },
  MEDIUM_TERM: { label: "Medium Term", window: "6–12 months" },
  LONG_TERM: { label: "Long Term", window: "12+ months" },
};

const HORIZON_ORDER: Horizon[] = ["QUICK_WIN", "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"];
const STATUS_ORDER: Status[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "DEFERRED"];
const WORKSTREAMS = ["Policy", "Process", "Technology", "People", "Data"];

const SELECT_CLS = "w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toInputDate(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

function isOverdue(item: RemediationItem): boolean {
  if (!item.targetDate || item.status === "COMPLETED") return false;
  return new Date(item.targetDate).getTime() < Date.now();
}

function ProgressBar({ pct, className, barClassName }: { pct: number; className?: string; barClassName?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

interface FormState {
  itemRef: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  horizon: Horizon;
  workstream: string;
  framework: string;
  sourceRef: string;
  ownerRole: string;
  effortDays: string;
  progressPct: number;
  startDate: string;
  targetDate: string;
  dependencies: string;
}

function emptyForm(): FormState {
  return {
    itemRef: "",
    title: "",
    description: "",
    priority: "P3",
    status: "NOT_STARTED",
    horizon: "SHORT_TERM",
    workstream: "Technology",
    framework: "",
    sourceRef: "",
    ownerRole: "",
    effortDays: "5",
    progressPct: 0,
    startDate: "",
    targetDate: "",
    dependencies: "",
  };
}

function toForm(item: RemediationItem): FormState {
  return {
    itemRef: item.itemRef,
    title: item.title,
    description: item.description ?? "",
    priority: item.priority,
    status: item.status,
    horizon: item.horizon,
    workstream: item.workstream ?? "Technology",
    framework: item.framework ?? "",
    sourceRef: item.sourceRef ?? "",
    ownerRole: item.ownerRole ?? "",
    effortDays: String(item.effortDays),
    progressPct: item.progressPct,
    startDate: toInputDate(item.startDate),
    targetDate: toInputDate(item.targetDate),
    dependencies: item.dependencies.join(", "),
  };
}

function RemediationModal({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: RemediationItem | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [form, setForm] = useState<FormState>(item ? toForm(item) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemRef.trim() || !form.title.trim()) {
      addNotification({ type: "warning", title: "Missing fields", message: "Item reference and title are required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        itemRef: form.itemRef.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        status: form.status,
        horizon: form.horizon,
        workstream: form.workstream || undefined,
        framework: form.framework.trim() || undefined,
        sourceRef: form.sourceRef.trim() || undefined,
        ownerRole: form.ownerRole.trim() || undefined,
        effortDays: parseInt(form.effortDays || "0", 10) || 0,
        progressPct: form.progressPct,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
        dependencies: form.dependencies
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      };

      if (item) {
        await api.patch(`/remediation/${item.id}`, payload);
        addNotification({ type: "success", title: "Item updated", message: `${form.itemRef} was saved.` });
      } else {
        await api.post("/remediation", payload);
        addNotification({ type: "success", title: "Remediation item created", message: `${form.itemRef} was added to the roadmap.` });
      }
      onSaved();
    } catch {
      // useApi already surfaces a toast on failure
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm(`Remove "${item.title}" from the remediation roadmap? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/remediation/${item.id}`);
      addNotification({ type: "success", title: "Item removed", message: `${item.itemRef} was deleted.` });
      onDeleted();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 sticky top-0 bg-card z-10 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {item ? "Edit Remediation Item" : "New Remediation Item"}
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Item Reference *</Label>
                <Input placeholder="e.g. REM-2026-014" value={form.itemRef} onChange={(e) => set("itemRef", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Source Reference</Label>
                <Input placeholder="e.g. Gap Assessment #GA-07" value={form.sourceRef} onChange={(e) => set("sourceRef", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Implement human-in-the-loop override for credit scoring model" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the gap, the remediation action, and the expected control outcome…"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select className={SELECT_CLS} value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                    <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select className={SELECT_CLS} value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Horizon</Label>
                <select className={SELECT_CLS} value={form.horizon} onChange={(e) => set("horizon", e.target.value as Horizon)}>
                  {HORIZON_ORDER.map((h) => (
                    <option key={h} value={h}>{HORIZON_CONFIG[h].label} ({HORIZON_CONFIG[h].window})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Workstream</Label>
                <select className={SELECT_CLS} value={form.workstream} onChange={(e) => set("workstream", e.target.value)}>
                  {WORKSTREAMS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Framework</Label>
                <Input placeholder="e.g. ISO/IEC 42001 Cl. 8.2, RBI FREE-AI" value={form.framework} onChange={(e) => set("framework", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner Role</Label>
                <Input placeholder="e.g. Head of Model Risk Management" value={form.ownerRole} onChange={(e) => set("ownerRole", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Effort (person-days)</Label>
                <Input type="number" min="0" step="1" value={form.effortDays} onChange={(e) => set("effortDays", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Target Date</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Progress</Label>
                <span className="text-xs font-semibold text-primary">{form.progressPct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progressPct}
                onChange={(e) => set("progressPct", parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dependencies</Label>
              <Input
                placeholder="Comma-separated, e.g. REM-2026-002, REM-2026-005"
                value={form.dependencies}
                onChange={(e) => set("dependencies", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Other item references this remediation depends on.</p>
            </div>

            <div className="flex gap-3 pt-2 border-t border-border">
              {item && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving} className="gap-1.5">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : item ? "Save Changes" : "Create Item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────────────────────

function RemediationCard({ item, compact = false, onClick }: { item: RemediationItem; compact?: boolean; onClick: () => void }) {
  const overdue = isOverdue(item);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-background border border-border rounded-lg hover:border-primary/40 hover:shadow-md transition-all",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <code className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{item.itemRef}</code>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={PRIORITY_CONFIG[item.priority].badge} className="text-[10px] px-1.5 py-0">{item.priority}</Badge>
          <Badge variant={STATUS_CONFIG[item.status].badge} className="text-[10px] px-1.5 py-0 gap-1">
            {STATUS_CONFIG[item.status].icon}
            {compact ? null : STATUS_CONFIG[item.status].label}
          </Badge>
        </div>
      </div>

      <p className={cn("font-medium leading-snug mb-2", compact ? "text-xs line-clamp-2" : "text-sm")}>{item.title}</p>

      {!compact && item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {item.workstream && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            <Layers className="h-2.5 w-2.5" /> {item.workstream}
          </span>
        )}
        {item.ownerRole && !compact && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            <User className="h-2.5 w-2.5" /> {item.ownerRole}
          </span>
        )}
        {item.effortDays > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            <Gauge className="h-2.5 w-2.5" /> {item.effortDays}d
          </span>
        )}
        {overdue && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="h-2.5 w-2.5" /> Overdue
          </span>
        )}
      </div>

      {item.dependencies.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.dependencies.map((d) => (
            <span key={d} className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border">
              <Link2 className="h-2.5 w-2.5" /> {d}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span className={cn("flex items-center gap-1", overdue && "text-red-400 font-medium")}>
          <Calendar className="h-3 w-3" /> {fmtDate(item.targetDate)}
        </span>
        <span className="font-semibold text-foreground">{item.progressPct}%</span>
      </div>
      <ProgressBar pct={item.progressPct} barClassName={item.status === "COMPLETED" ? "bg-green-500" : item.status === "BLOCKED" ? "bg-red-500" : undefined} />
    </button>
  );
}

// ── Roadmap View ──────────────────────────────────────────────────────────────

function RoadmapView({ items, onSelect }: { items: RemediationItem[]; onSelect: (item: RemediationItem) => void }) {
  if (items.length === 0) {
    return <EmptyState onCreate={undefined} filtered />;
  }
  return (
    <div className="space-y-4">
      {HORIZON_ORDER.map((horizon) => {
        const lane = items.filter((i) => i.horizon === horizon);
        if (lane.length === 0) return null;
        const totalEffort = lane.reduce((s, i) => s + i.effortDays, 0);
        const avgProgress = Math.round(lane.reduce((s, i) => s + i.progressPct, 0) / lane.length);
        return (
          <Card key={horizon}>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {HORIZON_CONFIG[horizon].label}
                    <span className="text-xs font-normal text-muted-foreground">({HORIZON_CONFIG[horizon].window})</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {lane.length} item{lane.length !== 1 ? "s" : ""} · {totalEffort} person-day{totalEffort !== 1 ? "s" : ""} of effort
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-48">
                  <ProgressBar pct={avgProgress} className="h-2" />
                  <span className="text-xs font-semibold text-foreground shrink-0">{avgProgress}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {lane.map((item) => (
                  <RemediationCard key={item.id} item={item} onClick={() => onSelect(item)} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────

function BoardView({ items, onSelect }: { items: RemediationItem[]; onSelect: (item: RemediationItem) => void }) {
  if (items.length === 0) {
    return <EmptyState onCreate={undefined} filtered />;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STATUS_ORDER.map((status) => {
        const col = items.filter((i) => i.status === status);
        return (
          <div key={status} className="w-72 shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                {STATUS_CONFIG[status].icon}
                {STATUS_CONFIG[status].label}
              </span>
              <span className="text-xs bg-muted text-muted-foreground px-1.5 rounded-full">{col.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[70vh] overflow-y-auto">
              {col.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No items</p>
              ) : (
                col.map((item) => (
                  <RemediationCard key={item.id} item={item} compact onClick={() => onSelect(item)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate, filtered = false }: { onCreate?: () => void; filtered?: boolean }) {
  return (
    <Card>
      <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-3">
        <ListChecks className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{filtered ? "No remediation items match these filters" : "No remediation items yet"}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {filtered
              ? "Try clearing a filter or search term."
              : "Roadmap items are usually raised from gap assessments and control testing findings. Add the first item to start tracking remediation."}
          </p>
        </div>
        {onCreate && !filtered && (
          <Button size="sm" onClick={onCreate} className="gap-1.5 mt-1">
            <Plus className="h-4 w-4" /> New Remediation Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RemediationPage() {
  const api = useApi();
  const { addNotification } = useUIStore();

  const [data, setData] = useState<RemediationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"roadmap" | "board">("roadmap");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [filterWorkstream, setFilterWorkstream] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [modalItem, setModalItem] = useState<RemediationItem | null | "new">(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<RemediationResponse>("/remediation");
      setData(res);
    } catch {
      // toast surfaced by useApi
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = data?.rows ?? [];
  const stats = data?.stats ?? { total: 0, completed: 0, inProgress: 0, blocked: 0, overallProgress: 0, p1Open: 0 };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterPriority && r.priority !== filterPriority) return false;
      if (filterWorkstream && r.workstream !== filterWorkstream) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (q) {
        const hay = `${r.itemRef} ${r.title} ${r.description ?? ""} ${r.ownerRole ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterPriority, filterWorkstream, filterStatus]);

  const hasFilters = Boolean(search || filterPriority || filterWorkstream || filterStatus);

  function closeModal() { setModalItem(null); }
  function handleSaved() { closeModal(); fetchData(); }
  function handleDeleted() { closeModal(); fetchData(); }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Prioritized Remediation Roadmap</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The risk-based action plan that comes out of gap assessments, control testing, and audit findings —
            what gets fixed, in what order, by whom, and by when. Sequenced across four delivery horizons so the
            board and RBI examiners can see a credible path to closure.
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={stats.total} icon={ListChecks} variant="default" />
        <StatCard title="P1 Open" value={stats.p1Open} subtitle="Critical, not yet closed" icon={AlertTriangle} variant={stats.p1Open > 0 ? "danger" : "default"} />
        <StatCard title="In Progress" value={stats.inProgress} icon={Loader2} variant="warning" />
        <StatCard title="Overall Progress" value={`${stats.overallProgress}%`} subtitle={`${stats.completed} of ${stats.total} closed`} icon={CheckCircle2} variant="success" />
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Remediation Items
                {filtered.length > 0 && <Badge variant="outline" className="text-xs ml-1">{filtered.length} shown</Badge>}
              </CardTitle>
              {/* View toggle */}
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <button
                  onClick={() => setView("roadmap")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    view === "roadmap" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Map className="h-3.5 w-3.5" /> Roadmap
                </button>
                <button
                  onClick={() => setView("board")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border",
                    view === "board" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Board
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button size="sm" onClick={() => setModalItem("new")} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Item
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search item ref, title, owner…"
                className="pl-8 h-8 text-xs w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | "")}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All priorities</option>
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterWorkstream}
                onChange={(e) => setFilterWorkstream(e.target.value)}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All workstreams</option>
                {WORKSTREAMS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as Status | "")}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All statuses</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setFilterPriority(""); setFilterWorkstream(""); setFilterStatus(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState onCreate={() => setModalItem("new")} />
      ) : view === "roadmap" ? (
        <RoadmapView items={filtered} onSelect={(item) => setModalItem(item)} />
      ) : (
        <BoardView items={filtered} onSelect={(item) => setModalItem(item)} />
      )}

      {/* Modal */}
      {modalItem !== null && (
        <RemediationModal
          item={modalItem === "new" ? null : modalItem}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
