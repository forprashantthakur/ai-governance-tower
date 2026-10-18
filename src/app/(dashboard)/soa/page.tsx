"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileCheck2, Search, ChevronDown, ChevronRight, Loader2, Save, Sparkles,
  ShieldCheck, AlertTriangle, Download,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ANNEX_A_GROUPS } from "@/lib/frameworks/iso42001";

// ── Types ─────────────────────────────────────────────────────────────────────

type SoaDecision = "APPLICABLE" | "APPLICABLE_PLANNED" | "NOT_APPLICABLE";
type SoaImplStatus = "NOT_IMPLEMENTED" | "PARTIAL" | "IMPLEMENTED";

interface SoaControl {
  id: string;
  controlRef: string;
  controlTitle: string;
  objectiveGroup: string;
  controlObjective: string;
  decision: SoaDecision;
  justification: string | null;
  implStatus: SoaImplStatus;
  implementationSummary: string | null;
  ownerRole: string | null;
  linkedPolicyCodes: string[];
}

const DECISION_META: Record<SoaDecision, { label: string; variant: "success" | "warning" | "secondary" }> = {
  APPLICABLE:         { label: "Applicable",         variant: "success" },
  APPLICABLE_PLANNED: { label: "Applicable (Planned)", variant: "warning" },
  NOT_APPLICABLE:      { label: "Not Applicable",      variant: "secondary" },
};

const IMPL_META: Record<SoaImplStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  IMPLEMENTED:     { label: "Implemented",     variant: "success" },
  PARTIAL:         { label: "Partial",         variant: "warning" },
  NOT_IMPLEMENTED: { label: "Not Implemented", variant: "danger" },
};

const DECISION_FILTERS: (SoaDecision | "ALL")[] = ["ALL", "APPLICABLE", "APPLICABLE_PLANNED", "NOT_APPLICABLE"];

function missingJustification(c: SoaControl) {
  return c.decision === "NOT_APPLICABLE" && !c.justification?.trim();
}

function computeStats(controls: SoaControl[]) {
  const applicable = controls.filter((c) => c.decision !== "NOT_APPLICABLE").length;
  const implemented = controls.filter((c) => c.implStatus === "IMPLEMENTED").length;
  const partial = controls.filter((c) => c.implStatus === "PARTIAL").length;
  const excluded = controls.filter((c) => c.decision === "NOT_APPLICABLE").length;
  const violations = controls.filter(missingJustification).length;
  return { total: controls.length, applicable, implemented, partial, excluded, violations };
}

function DecisionBadge({ decision }: { decision: SoaDecision }) {
  const meta = DECISION_META[decision];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function ImplBadge({ status }: { status: SoaImplStatus }) {
  const meta = IMPL_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function StatTile({ label, value, sub, danger }: { label: string; value: string | number; sub?: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${danger ? "text-red-400" : ""}`}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────

function csvEscape(v: string) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(controls: SoaControl[]) {
  const header = ["Control Ref", "Title", "Group", "Decision", "Justification", "Implementation Status", "Owner"];
  const rows = controls.map((c) => [
    c.controlRef,
    c.controlTitle,
    c.objectiveGroup,
    DECISION_META[c.decision].label,
    c.justification ?? "",
    IMPL_META[c.implStatus].label,
    c.ownerRole ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-of-applicability-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Inline expanded editor ───────────────────────────────────────────────────

interface EditState {
  decision: SoaDecision;
  justification: string;
  implStatus: SoaImplStatus;
  implementationSummary: string;
  ownerRole: string;
  linkedPolicyCodes: string;
  saving: boolean;
  saved: boolean;
  error: string;
}

function toEditState(c: SoaControl): EditState {
  return {
    decision: c.decision,
    justification: c.justification ?? "",
    implStatus: c.implStatus,
    implementationSummary: c.implementationSummary ?? "",
    ownerRole: c.ownerRole ?? "",
    linkedPolicyCodes: (c.linkedPolicyCodes ?? []).join(", "),
    saving: false,
    saved: false,
    error: "",
  };
}

function ControlRow({
  control, expanded, onToggle, onSaved, api, addNotification,
}: {
  control: SoaControl;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: SoaControl) => void;
  api: ReturnType<typeof useApi>;
  addNotification: (n: { type: "success" | "error" | "warning" | "info"; title: string; message?: string }) => void;
}) {
  const [edit, setEdit] = useState<EditState>(() => toEditState(control));

  useEffect(() => {
    if (expanded) setEdit(toEditState(control));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, control.id]);

  async function save() {
    setEdit((p) => ({ ...p, saving: true, saved: false, error: "" }));
    try {
      const updated = await api.patch<SoaControl>(`/soa/${control.id}`, {
        decision: edit.decision,
        justification: edit.justification || null,
        implStatus: edit.implStatus,
        implementationSummary: edit.implementationSummary || null,
        ownerRole: edit.ownerRole || null,
        linkedPolicyCodes: edit.linkedPolicyCodes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEdit((p) => ({ ...p, saving: false, saved: true }));
      addNotification({ type: "success", title: "Control updated", message: `${control.controlRef} saved` });
      onSaved(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setEdit((p) => ({ ...p, saving: false, error: msg }));
    }
  }

  const warn = missingJustification(control);

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
        <span className="font-mono font-bold text-xs text-primary w-24 shrink-0">{control.controlRef}</span>
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{control.controlTitle}</span>
        {warn && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
        {control.linkedPolicyCodes.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {control.linkedPolicyCodes.slice(0, 2).map((code) => (
              <span key={code} className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground font-mono">{code}</span>
            ))}
            {control.linkedPolicyCodes.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{control.linkedPolicyCodes.length - 2}</span>
            )}
          </div>
        )}
        <span className="text-[11px] text-muted-foreground w-36 truncate hidden md:block">{control.ownerRole ?? "—"}</span>
        <ImplBadge status={control.implStatus} />
        <DecisionBadge decision={control.decision} />
      </button>

      {expanded && (
        <div className="px-4 pb-5 pt-1 space-y-4 bg-muted/10">
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Control Objective</p>
            <p className="text-xs leading-relaxed text-foreground">{control.controlObjective}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Decision</Label>
              <select
                value={edit.decision}
                onChange={(e) => setEdit((p) => ({ ...p, decision: e.target.value as SoaDecision, saved: false }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(DECISION_META) as SoaDecision[]).map((d) => (
                  <option key={d} value={d}>{DECISION_META[d].label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Implementation Status</Label>
              <select
                value={edit.implStatus}
                onChange={(e) => setEdit((p) => ({ ...p, implStatus: e.target.value as SoaImplStatus, saved: false }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(Object.keys(IMPL_META) as SoaImplStatus[]).map((s) => (
                  <option key={s} value={s}>{IMPL_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={`text-xs ${edit.decision === "NOT_APPLICABLE" && !edit.justification.trim() ? "text-yellow-400" : ""}`}>
              Justification (required if Not Applicable)
            </Label>
            <Textarea
              rows={2}
              value={edit.justification}
              onChange={(e) => setEdit((p) => ({ ...p, justification: e.target.value, saved: false }))}
              placeholder="Explain why this control does not apply — e.g. the organization does not act as a third-party AI supplier."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Implementation Summary</Label>
            <Textarea
              rows={2}
              value={edit.implementationSummary}
              onChange={(e) => setEdit((p) => ({ ...p, implementationSummary: e.target.value, saved: false }))}
              placeholder="Describe how this control is implemented and where the evidence lives..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Owner Role</Label>
              <Input
                value={edit.ownerRole}
                onChange={(e) => setEdit((p) => ({ ...p, ownerRole: e.target.value, saved: false }))}
                placeholder="e.g. Head of AI Engineering"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Linked Policy Codes</Label>
              <Input
                value={edit.linkedPolicyCodes}
                onChange={(e) => setEdit((p) => ({ ...p, linkedPolicyCodes: e.target.value, saved: false }))}
                placeholder="e.g. POL-AI-01, POL-DATA-03"
              />
            </div>
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

export default function SoaPage() {
  const api = useApi();
  const { addNotification } = useUIStore();

  const [controls, setControls] = useState<SoaControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<SoaDecision | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ controls: SoaControl[] }>("/soa");
      setControls(data.controls ?? []);
    } catch {
      // error already surfaced by useApi
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function loadAnnexA() {
    setSeeding(true);
    try {
      await api.post("/soa/seed", {});
      addNotification({ type: "success", title: "Annex A loaded", message: "38 ISO/IEC 42001 controls installed" });
      await load();
    } catch {
      // error already surfaced by useApi
    } finally {
      setSeeding(false);
    }
  }

  const stats = useMemo(() => computeStats(controls), [controls]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return controls.filter((c) => {
      if (decisionFilter !== "ALL" && c.decision !== decisionFilter) return false;
      if (q && !`${c.controlRef} ${c.controlTitle}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [controls, decisionFilter, search]);

  const groups = useMemo(() => {
    return ANNEX_A_GROUPS.map((group) => {
      const all = controls.filter((c) => c.objectiveGroup === group);
      const shown = filtered.filter((c) => c.objectiveGroup === group);
      const applicable = all.filter((c) => c.decision !== "NOT_APPLICABLE");
      const implemented = applicable.filter((c) => c.implStatus === "IMPLEMENTED").length;
      return { group, all, shown, applicable, implemented };
    }).filter((g) => g.all.length > 0);
  }, [controls, filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Statement of Applicability
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            ISO/IEC 42001:2023 Annex A — the auditable record of which of the 38 Annex A controls apply to
            this organization, why, and whether each is implemented. This is the artefact a certification
            body reads first.
          </p>
        </div>
        {controls.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportCsv(controls)}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : controls.length === 0 ? (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="text-base font-semibold">Load the Annex A control catalogue</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              This installs the 38 ISO/IEC 42001 Annex A controls across all 9 objective groups (A.2–A.10)
              so you can record an applicability decision, justification and implementation status for each.
            </p>
            <Button onClick={loadAnnexA} disabled={seeding}>
              {seeding ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Load Annex A Controls</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Applicable Controls" value={stats.applicable} sub={`of ${stats.total} total`} />
            <StatTile label="Implemented" value={stats.implemented} />
            <StatTile label="Partial" value={stats.partial} />
            <StatTile label="Excluded (N/A)" value={stats.excluded} />
          </div>

          {/* Compliance callout */}
          {stats.violations > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-400">
                <span className="font-semibold">{stats.violations} excluded control{stats.violations === 1 ? "" : "s"}</span>{" "}
                {stats.violations === 1 ? "is" : "are"} missing a documented justification — an auditor will raise this.
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {DECISION_FILTERS.map((d) => {
                const count = d === "ALL" ? controls.length : controls.filter((c) => c.decision === d).length;
                const label = d === "ALL" ? "All" : DECISION_META[d].label;
                return (
                  <button
                    key={d}
                    onClick={() => setDecisionFilter(d)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      decisionFilter === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
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
                placeholder="Search control ref or title..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Objective groups */}
          <div className="space-y-4">
            {groups.map(({ group, all, shown, applicable, implemented }) => {
              const pct = applicable.length > 0 ? Math.round((implemented / applicable.length) * 100) : 0;
              const collapsed = collapsedGroups[group];
              return (
                <Card key={group}>
                  <CardHeader
                    className="pb-3 cursor-pointer select-none"
                    onClick={() => setCollapsedGroups((p) => ({ ...p, [group]: !p[group] }))}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        {group}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {implemented} of {applicable.length} applicable implemented ({all.length} total)
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </CardHeader>
                  {!collapsed && (
                    <CardContent className="p-0">
                      {shown.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-4 pb-4">No controls in this group match the current filters.</p>
                      ) : (
                        shown.map((control) => (
                          <ControlRow
                            key={control.id}
                            control={control}
                            expanded={expandedId === control.id}
                            onToggle={() => setExpandedId(expandedId === control.id ? null : control.id)}
                            onSaved={(updated) => setControls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
                            api={api}
                            addNotification={addNotification}
                          />
                        ))
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
