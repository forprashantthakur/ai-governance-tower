"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertOctagon, Plus, RefreshCw, X, ChevronDown, ChevronUp, Loader2, Search,
  Filter, Trash2, Save, Calendar, User, FileWarning, ShieldAlert, Wrench,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/shared/stat-card";

// ── Types ─────────────────────────────────────────────────────────────────────

type NcrType = "MAJOR" | "MINOR" | "OBSERVATION" | "OFI";
type NcrStatus = "OPEN" | "UNDER_INVESTIGATION" | "CAPA_ASSIGNED" | "PENDING_VERIFICATION" | "CLOSED";
type CapaActionType = "CORRECTIVE" | "PREVENTIVE";
type CapaStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED" | "OVERDUE";

interface Capa {
  id: string;
  ncrId: string;
  capaRef: string;
  actionType: CapaActionType;
  description: string;
  ownerRole: string | null;
  dueDate: string | null;
  status: CapaStatus;
  completedAt: string | null;
  effectivenessCheck: string | null;
  effectivenessVerifiedAt: string | null;
  createdAt: string;
}

interface Ncr {
  id: string;
  ncrRef: string;
  title: string;
  description: string;
  type: NcrType;
  status: NcrStatus;
  clauseRef: string | null;
  source: string | null;
  raisedBy: string | null;
  raisedAt: string;
  rootCause: string | null;
  immediateCorrection: string | null;
  dueDate: string | null;
  closedAt: string | null;
  verifiedBy: string | null;
  capas: Capa[];
}

interface Stats {
  openNcrs: number;
  majorOpen: number;
  overdueNcrs: number;
  overdueCapas: number;
  pipeline: Record<NcrStatus, number>;
}

interface ListResponse {
  ncrs: Ncr[];
  stats: Stats;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<NcrType, string> = {
  MAJOR: "Major",
  MINOR: "Minor",
  OBSERVATION: "Observation",
  OFI: "OFI",
};

const TYPE_VARIANT: Record<NcrType, "danger" | "warning" | "info" | "secondary"> = {
  MAJOR: "danger",
  MINOR: "warning",
  OBSERVATION: "info",
  OFI: "secondary",
};

const STATUS_LABEL: Record<NcrStatus, string> = {
  OPEN: "Open",
  UNDER_INVESTIGATION: "Under Investigation",
  CAPA_ASSIGNED: "CAPA Assigned",
  PENDING_VERIFICATION: "Pending Verification",
  CLOSED: "Closed",
};

const STATUS_VARIANT: Record<NcrStatus, "secondary" | "warning" | "info" | "purple" | "success"> = {
  OPEN: "secondary",
  UNDER_INVESTIGATION: "warning",
  CAPA_ASSIGNED: "info",
  PENDING_VERIFICATION: "purple",
  CLOSED: "success",
};

const STATUS_PIPELINE: NcrStatus[] = ["OPEN", "UNDER_INVESTIGATION", "CAPA_ASSIGNED", "PENDING_VERIFICATION", "CLOSED"];

const CAPA_ACTION_LABEL: Record<CapaActionType, string> = {
  CORRECTIVE: "Corrective",
  PREVENTIVE: "Preventive",
};

const CAPA_ACTION_VARIANT: Record<CapaActionType, "warning" | "info"> = {
  CORRECTIVE: "warning",
  PREVENTIVE: "info",
};

const CAPA_STATUS_LABEL: Record<CapaStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
  OVERDUE: "Overdue",
};

const CAPA_STATUS_VARIANT: Record<CapaStatus, "secondary" | "info" | "success" | "danger"> = {
  OPEN: "secondary",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  VERIFIED: "success",
  OVERDUE: "danger",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(dueDate: string | null, closed: boolean): boolean {
  if (!dueDate || closed) return false;
  return new Date(dueDate) < new Date();
}

// ── Raise NCR Modal ──────────────────────────────────────────────────────────

function RaiseNcrModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { post } = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "MINOR" as NcrType,
    clauseRef: "",
    source: "",
    raisedBy: "",
    dueDate: "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      addNotification({ type: "warning", title: "Missing fields", message: "Title and description are required." });
      return;
    }
    setSaving(true);
    try {
      await post("/ncr", {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        clauseRef: form.clauseRef.trim() || undefined,
        source: form.source.trim() || undefined,
        raisedBy: form.raisedBy.trim() || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      });
      addNotification({ type: "success", title: "NCR raised", message: form.title });
      onCreated();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-primary" /> Raise Non-Conformity
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g. Missing human-oversight sign-off before deployment"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="MAJOR">Major</option>
                  <option value="MINOR">Minor</option>
                  <option value="OBSERVATION">Observation</option>
                  <option value="OFI">Opportunity for Improvement</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the non-conformity in full — what was observed, against which requirement…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Clause Ref</Label>
                <Input placeholder="e.g. ISO 42001 §8.2" value={form.clauseRef} onChange={(e) => set("clauseRef", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input placeholder="e.g. Internal Audit Q3" value={form.source} onChange={(e) => set("source", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Raised By</Label>
                <Input placeholder="e.g. J. Mehta" value={form.raisedBy} onChange={(e) => set("raisedBy", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5 max-w-[200px]">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </CardContent>
          <div className="flex gap-3 px-6 pb-6">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Raising…</> : "Raise NCR"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── Add CAPA Modal ───────────────────────────────────────────────────────────

function AddCapaModal({
  ncrId,
  onClose,
  onCreated,
}: {
  ncrId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { post } = useApi();
  const { addNotification } = useUIStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    actionType: "CORRECTIVE" as CapaActionType,
    description: "",
    ownerRole: "",
    dueDate: "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) {
      addNotification({ type: "warning", title: "Missing fields", message: "CAPA description is required." });
      return;
    }
    setSaving(true);
    try {
      await post(`/ncr/${ncrId}/capa`, {
        actionType: form.actionType,
        description: form.description.trim(),
        ownerRole: form.ownerRole.trim() || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      });
      addNotification({ type: "success", title: "CAPA added" });
      onCreated();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> Add Corrective / Preventive Action
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Action Type</Label>
              <div className="flex gap-2">
                {(["CORRECTIVE", "PREVENTIVE"] as CapaActionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("actionType", t)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      form.actionType === t
                        ? t === "CORRECTIVE"
                          ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                          : "bg-blue-500/20 border-blue-500 text-blue-400"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {CAPA_ACTION_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the action to be taken…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner Role</Label>
                <Input placeholder="e.g. MLOps Team" value={form.ownerRole} onChange={(e) => set("ownerRole", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </div>
            </div>
          </CardContent>
          <div className="flex gap-3 px-6 pb-6">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Add CAPA"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ── CAPA row ─────────────────────────────────────────────────────────────────

function CapaRow({ ncrId, capa, onChanged }: { ncrId: string; capa: Capa; onChanged: () => void }) {
  const { patch, del } = useApi();
  const { addNotification } = useUIStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState(capa.status);
  const [effectivenessCheck, setEffectivenessCheck] = useState(capa.effectivenessCheck ?? "");

  async function save() {
    setSaving(true);
    try {
      await patch(`/ncr/${ncrId}/capa/${capa.id}`, {
        status,
        effectivenessCheck: effectivenessCheck.trim() || null,
      });
      addNotification({ type: "success", title: "CAPA updated", message: capa.capaRef });
      setEditing(false);
      onChanged();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete CAPA ${capa.capaRef}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await del(`/ncr/${ncrId}/capa/${capa.id}`);
      addNotification({ type: "success", title: "CAPA deleted", message: capa.capaRef });
      onChanged();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-background/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">{capa.capaRef}</code>
            <Badge variant={CAPA_ACTION_VARIANT[capa.actionType]} className="text-[10px]">{CAPA_ACTION_LABEL[capa.actionType]}</Badge>
            <Badge variant={CAPA_STATUS_VARIANT[capa.status]} className="text-[10px]">{CAPA_STATUS_LABEL[capa.status]}</Badge>
          </div>
          <p className="text-xs">{capa.description}</p>
          <div className="flex items-center gap-3 flex-wrap mt-1.5 text-[11px] text-muted-foreground">
            {capa.ownerRole && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {capa.ownerRole}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {fmtDate(capa.dueDate)}</span>
            {capa.effectivenessCheck && <span className="italic">Effectiveness: {capa.effectivenessCheck}</span>}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 text-[11px] text-primary hover:underline"
        >
          {editing ? "Cancel" : "Update"}
        </button>
      </div>

      {editing && (
        <div className="border-t border-border pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CapaStatus)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {(Object.keys(CAPA_STATUS_LABEL) as CapaStatus[]).map((s) => (
                  <option key={s} value={s}>{CAPA_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effectiveness Check</Label>
              <Input
                className="h-9 text-xs"
                placeholder="e.g. Verified in next audit cycle"
                value={effectivenessCheck}
                onChange={(e) => setEffectivenessCheck(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
            </Button>
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── NCR Card ─────────────────────────────────────────────────────────────────

function NcrCard({ ncr, onChanged }: { ncr: Ncr; onChanged: () => void }) {
  const { patch } = useApi();
  const { addNotification } = useUIStore();
  const [expanded, setExpanded] = useState(false);
  const [showAddCapa, setShowAddCapa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: ncr.status,
    description: ncr.description,
    rootCause: ncr.rootCause ?? "",
    immediateCorrection: ncr.immediateCorrection ?? "",
  });

  const overdue = isOverdue(ncr.dueDate, ncr.status === "CLOSED");
  const needsCapaWarning =
    ncr.capas.length === 0 && (ncr.status === "CAPA_ASSIGNED" || ncr.status === "PENDING_VERIFICATION" || ncr.status === "CLOSED");

  async function save() {
    setSaving(true);
    try {
      await patch(`/ncr/${ncr.id}`, {
        status: form.status,
        description: form.description.trim(),
        rootCause: form.rootCause.trim() || null,
        immediateCorrection: form.immediateCorrection.trim() || null,
      });
      addNotification({ type: "success", title: "NCR updated", message: ncr.ncrRef });
      onChanged();
    } catch {
      // toast already shown
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer select-none py-4" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">{ncr.ncrRef}</code>
              <CardTitle className="text-sm font-semibold">{ncr.title}</CardTitle>
              <Badge variant={TYPE_VARIANT[ncr.type]} className="text-[10px]">{TYPE_LABEL[ncr.type]}</Badge>
              <Badge variant={STATUS_VARIANT[ncr.status]} className="text-[10px]">{STATUS_LABEL[ncr.status]}</Badge>
              {needsCapaWarning && (
                <Badge variant="warning" className="text-[10px] flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> No CAPA recorded
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
              {ncr.clauseRef && <span>Clause: {ncr.clauseRef}</span>}
              {ncr.source && <span>Source: {ncr.source}</span>}
              {ncr.raisedBy && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ncr.raisedBy}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Raised {fmtDate(ncr.raisedAt)}</span>
              {ncr.dueDate && (
                <span className={`flex items-center gap-1 ${overdue ? "text-red-400 font-medium" : ""}`}>
                  <Calendar className="h-3 w-3" /> Due {fmtDate(ncr.dueDate)}{overdue ? " (overdue)" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">{ncr.capas.length} CAPA{ncr.capas.length !== 1 ? "s" : ""}</span>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4 border-t border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as NcrStatus }))}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {STATUS_PIPELINE.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Root Cause</Label>
              <Textarea value={form.rootCause} onChange={(e) => setForm((p) => ({ ...p, rootCause: e.target.value }))} rows={2} placeholder="Why did this non-conformity occur?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Immediate Correction</Label>
              <Textarea value={form.immediateCorrection} onChange={(e) => setForm((p) => ({ ...p, immediateCorrection: e.target.value }))} rows={2} placeholder="What containment action was taken immediately?" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Changes
            </Button>
          </div>

          {/* CAPA list */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrective / Preventive Actions</p>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddCapa(true)}>
                <Plus className="h-3.5 w-3.5" /> Add CAPA
              </Button>
            </div>
            {ncr.capas.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No CAPAs recorded for this non-conformity yet.</p>
            ) : (
              <div className="space-y-2">
                {ncr.capas.map((c) => (
                  <CapaRow key={c.id} ncrId={ncr.id} capa={c} onChanged={onChanged} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {showAddCapa && (
        <AddCapaModal
          ncrId={ncr.id}
          onClose={() => setShowAddCapa(false)}
          onCreated={() => { setShowAddCapa(false); onChanged(); }}
        />
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NcrCapaPage() {
  const { get } = useApi();

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaise, setShowRaise] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<NcrType | "">("");
  const [filterStatus, setFilterStatus] = useState<NcrStatus | "">("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<ListResponse>("/ncr");
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNcrs(); }, [fetchNcrs]);

  const ncrs = data?.ncrs ?? [];
  const stats = data?.stats ?? {
    openNcrs: 0, majorOpen: 0, overdueNcrs: 0, overdueCapas: 0,
    pipeline: { OPEN: 0, UNDER_INVESTIGATION: 0, CAPA_ASSIGNED: 0, PENDING_VERIFICATION: 0, CLOSED: 0 },
  };

  const filtered = ncrs.filter((n) => {
    if (filterType && n.type !== filterType) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.ncrRef.toLowerCase().includes(q) && !n.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <FileWarning className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Non-Conformity &amp; CAPA Register — ISO/IEC 42001 Clause 10.2</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log non-conformities against the AI management system, record root cause and immediate correction,
            and track corrective / preventive actions through to verified closure.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Open NCRs" value={stats.openNcrs} icon={AlertOctagon} variant={stats.openNcrs > 0 ? "danger" : "default"} />
        <StatCard title="Major (Open)" value={stats.majorOpen} icon={ShieldAlert} variant={stats.majorOpen > 0 ? "danger" : "default"} />
        <StatCard title="Overdue NCRs" value={stats.overdueNcrs} icon={Calendar} variant={stats.overdueNcrs > 0 ? "danger" : "default"} />
        <StatCard title="Overdue CAPAs" value={stats.overdueCapas} icon={Wrench} variant={stats.overdueCapas > 0 ? "danger" : "default"} />
      </div>

      {/* Status pipeline */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Status Pipeline</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_PIPELINE.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  filterStatus === s ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/30"
                }`}
              >
                {STATUS_LABEL[s]}
                <Badge variant={STATUS_VARIANT[s]} className="text-[10px]">{stats.pipeline[s] ?? 0}</Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" />
              Non-Conformities
              <Badge variant="outline" className="text-xs">{filtered.length} of {ncrs.length}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchNcrs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => setShowRaise(true)}>
                <Plus className="h-4 w-4" /> Raise NCR
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ref or title…"
                className="pl-8 h-8 text-xs w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as NcrType | "")}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All types</option>
                <option value="MAJOR">Major</option>
                <option value="MINOR">Minor</option>
                <option value="OBSERVATION">Observation</option>
                <option value="OFI">OFI</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as NcrStatus | "")}
                className="appearance-none bg-background border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All statuses</option>
                {STATUS_PIPELINE.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            {(search || filterType || filterStatus) && (
              <button
                onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertOctagon className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                {ncrs.length === 0 ? "No non-conformities recorded yet." : "No non-conformities match the current filters."}
              </p>
              {ncrs.length === 0 && (
                <Button size="sm" className="gap-1.5" onClick={() => setShowRaise(true)}>
                  <Plus className="h-3.5 w-3.5" /> Raise the first NCR
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((ncr) => (
                <NcrCard key={ncr.id} ncr={ncr} onChanged={fetchNcrs} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showRaise && (
        <RaiseNcrModal
          onClose={() => setShowRaise(false)}
          onCreated={() => { setShowRaise(false); fetchNcrs(); }}
        />
      )}
    </div>
  );
}
