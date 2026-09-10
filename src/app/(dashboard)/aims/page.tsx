"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Search, ChevronDown, ChevronRight, Loader2, Save,
  Sparkles, ShieldCheck, CircleDot, Circle,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AIMS_SECTIONS } from "@/lib/frameworks/iso42001";

// ── Types ─────────────────────────────────────────────────────────────────────

type AimsStatus = "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "VERIFIED";

interface AimsClause {
  id: string;
  clauseNo: string;
  clauseTitle: string;
  section: string;
  requirement: string;
  status: AimsStatus;
  maturityLevel: number;
  ownerRole: string | null;
  evidence: string | null;
  implementationNotes: string | null;
  lastReviewedAt: string | null;
}

const STATUS_META: Record<AimsStatus, { label: string; variant: "secondary" | "warning" | "info" | "success" }> = {
  NOT_STARTED: { label: "Not Started", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  IMPLEMENTED:  { label: "Implemented", variant: "info" },
  VERIFIED:     { label: "Verified",    variant: "success" },
};

const STATUS_FILTERS: (AimsStatus | "ALL")[] = ["ALL", "NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"];

// Weighted implementation-% formula — kept identical to /api/aims's server-side calc
// so the stat row matches after every local edit without a refetch.
function computeStats(clauses: AimsClause[]) {
  const total = clauses.length;
  const verified = clauses.filter((c) => c.status === "VERIFIED").length;
  const implemented = clauses.filter((c) => c.status === "IMPLEMENTED").length;
  const inProgress = clauses.filter((c) => c.status === "IN_PROGRESS").length;
  const notStarted = clauses.filter((c) => c.status === "NOT_STARTED").length;
  const weighted = verified * 1 + implemented * 0.75 + inProgress * 0.4;
  const overallPct = total > 0 ? Math.round((weighted / total) * 100) : 0;
  return { total, verified, implemented, inProgress, notStarted, overallPct };
}

function StatusBadge({ status }: { status: AimsStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function MaturityDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`Maturity level ${level}/5`}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < level ? (
          <CircleDot key={i} className="h-2.5 w-2.5 text-primary" />
        ) : (
          <Circle key={i} className="h-2.5 w-2.5 text-muted-foreground/30" />
        )
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Inline expanded editor ───────────────────────────────────────────────────

interface EditState {
  status: AimsStatus;
  maturityLevel: number;
  ownerRole: string;
  evidence: string;
  implementationNotes: string;
  saving: boolean;
  saved: boolean;
  error: string;
}

function ClauseRow({
  clause, expanded, onToggle, onSaved, api, addNotification,
}: {
  clause: AimsClause;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: AimsClause) => void;
  api: ReturnType<typeof useApi>;
  addNotification: (n: { type: "success" | "error" | "warning" | "info"; title: string; message?: string }) => void;
}) {
  const [edit, setEdit] = useState<EditState>({
    status: clause.status,
    maturityLevel: clause.maturityLevel,
    ownerRole: clause.ownerRole ?? "",
    evidence: clause.evidence ?? "",
    implementationNotes: clause.implementationNotes ?? "",
    saving: false,
    saved: false,
    error: "",
  });

  useEffect(() => {
    if (!expanded) return;
    setEdit({
      status: clause.status,
      maturityLevel: clause.maturityLevel,
      ownerRole: clause.ownerRole ?? "",
      evidence: clause.evidence ?? "",
      implementationNotes: clause.implementationNotes ?? "",
      saving: false,
      saved: false,
      error: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, clause.id]);

  async function save() {
    setEdit((p) => ({ ...p, saving: true, saved: false, error: "" }));
    try {
      const updated = await api.patch<AimsClause>(`/aims/${clause.id}`, {
        status: edit.status,
        maturityLevel: edit.maturityLevel,
        ownerRole: edit.ownerRole || null,
        evidence: edit.evidence || null,
        implementationNotes: edit.implementationNotes || null,
      });
      setEdit((p) => ({ ...p, saving: false, saved: true }));
      addNotification({ type: "success", title: "Clause updated", message: `${clause.clauseNo} saved` });
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setEdit((p) => ({ ...p, saving: false, error: msg }));
    }
  }

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-mono font-bold text-xs text-primary w-14 shrink-0">{clause.clauseNo}</span>
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{clause.clauseTitle}</span>
        <MaturityDots level={clause.maturityLevel} />
        <span className="text-[11px] text-muted-foreground w-40 truncate hidden md:block">{clause.ownerRole ?? "—"}</span>
        <StatusBadge status={clause.status} />
      </button>

      {expanded && (
        <div className="px-4 pb-5 pt-1 space-y-4 bg-muted/10">
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requirement</p>
            <p className="text-xs leading-relaxed text-foreground">{clause.requirement}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={edit.status}
                onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value as AimsStatus, saved: false }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(STATUS_META) as AimsStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Maturity Level (0–5)</Label>
              <select
                value={edit.maturityLevel}
                onChange={(e) => setEdit((p) => ({ ...p, maturityLevel: Number(e.target.value), saved: false }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Owner Role</Label>
            <Input
              value={edit.ownerRole}
              onChange={(e) => setEdit((p) => ({ ...p, ownerRole: e.target.value, saved: false }))}
              placeholder="e.g. Chief Risk Officer"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Evidence</Label>
            <Textarea
              rows={2}
              value={edit.evidence}
              onChange={(e) => setEdit((p) => ({ ...p, evidence: e.target.value, saved: false }))}
              placeholder="Documented information / artefact reference demonstrating conformance..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Implementation Notes</Label>
            <Textarea
              rows={2}
              value={edit.implementationNotes}
              onChange={(e) => setEdit((p) => ({ ...p, implementationNotes: e.target.value, saved: false }))}
              placeholder="Internal notes — remediation plan, next review date..."
            />
          </div>

          {edit.error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5">{edit.error}</p>
          )}

          <div className="flex items-center justify-between">
            {edit.saved ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Saved
              </span>
            ) : <span />}
            <Button size="sm" onClick={save} disabled={edit.saving}>
              {edit.saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
              ) : (
                <><Save className="h-3.5 w-3.5 mr-1.5" /> Save</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AimsPage() {
  const api = useApi();
  const { addNotification } = useUIStore();

  const [clauses, setClauses] = useState<AimsClause[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AimsStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ clauses: AimsClause[] }>("/aims");
      setClauses(data.clauses ?? []);
    } catch {
      // error already surfaced by useApi
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function initializeAims() {
    setSeeding(true);
    try {
      await api.post("/aims/seed", {});
      addNotification({ type: "success", title: "AIMS initialized", message: "27 ISO/IEC 42001 clauses installed" });
      await load();
    } catch {
      // error already surfaced by useApi
    } finally {
      setSeeding(false);
    }
  }

  const stats = useMemo(() => computeStats(clauses), [clauses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clauses.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (q && !`${c.clauseNo} ${c.clauseTitle}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clauses, statusFilter, search]);

  const sections = useMemo(() => {
    return AIMS_SECTIONS.map((section) => {
      const all = clauses.filter((c) => c.section === section);
      const shown = filtered.filter((c) => c.section === section);
      const implementedCount = all.filter((c) => c.status === "IMPLEMENTED" || c.status === "VERIFIED").length;
      return { section, all, shown, implementedCount };
    }).filter((g) => g.all.length > 0);
  }, [clauses, filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          AI Management System (AIMS)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ISO/IEC 42001:2023 management-system requirements — Clauses 4 (Context) through 10 (Improvement).
          Track conformance, maturity and ownership for every clause the certification body will assess.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : clauses.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="text-base font-semibold">Initialize your AI Management System</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This installs the 27 ISO/IEC 42001 Clause 4–10 requirements — Context, Leadership, Planning,
              Support, Operation, Performance Evaluation and Improvement — as a tracked, ownable workspace.
            </p>
            <Button onClick={initializeAims} disabled={seeding}>
              {seeding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Initializing…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Initialize AIMS</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Overall Implementation" value={`${stats.overallPct}%`} sub={`${stats.total} clauses tracked`} />
            <StatTile label="Verified" value={stats.verified} />
            <StatTile label="In Progress" value={stats.inProgress} />
            <StatTile label="Not Started" value={stats.notStarted} />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map((s) => {
                const count = s === "ALL" ? clauses.length : clauses.filter((c) => c.status === s).length;
                const label = s === "ALL" ? "All" : STATUS_META[s].label;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clause number or title..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map(({ section, all, shown, implementedCount }) => {
              const pct = all.length > 0 ? Math.round((implementedCount / all.length) * 100) : 0;
              return (
                <Card key={section}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-sm">{section}</CardTitle>
                      <span className="text-xs text-muted-foreground shrink-0">{implementedCount} of {all.length} implemented</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {shown.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 pb-4">No clauses in this section match the current filters.</p>
                    ) : (
                      shown.map((clause) => (
                        <ClauseRow
                          key={clause.id}
                          clause={clause}
                          expanded={expandedId === clause.id}
                          onToggle={() => setExpandedId(expandedId === clause.id ? null : clause.id)}
                          onSaved={(updated) => setClauses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
                          api={api}
                          addNotification={addNotification}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
