"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Library,
  FileText,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Landmark,
  CalendarClock,
  Sparkles,
  Network,
  GitBranch,
  Users,
  User,
  MessageSquare,
  Eye,
  RefreshCw,
  BookOpen,
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
import { LIFECYCLE_PHASES } from "@/lib/frameworks/policy-catalog";

// ── Types ─────────────────────────────────────────────────────────────────

type PolicyDocType = "CHARTER" | "POLICY" | "MANUAL" | "STANDARD" | "PROCEDURE" | "SOP" | "GUIDELINE";
type PolicyDocStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "BOARD_APPROVAL_PENDING"
  | "APPROVED"
  | "PUBLISHED"
  | "SUPERSEDED"
  | "RETIRED";
type GovernanceLayer = "BOARD" | "BOARD_COMMITTEE" | "EXECUTIVE" | "MANAGEMENT" | "OPERATIONAL";
type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

interface PolicyDocument {
  id: string;
  docCode: string;
  title: string;
  type: PolicyDocType;
  status: PolicyDocStatus;
  version: string;
  summary: string | null;
  content: string | null;
  ownerRole: string | null;
  approverRole: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  effectiveFrom: string | null;
  nextReviewDate: string | null;
  integratesWith: string[];
  frameworkRefs: string[];
  createdAt: string;
  updatedAt: string;
}

interface PolicyStats {
  total: number;
  published: number;
  pendingBoardApproval: number;
  dueForReview90: number;
}

interface PoliciesResponse {
  documents: PolicyDocument[];
  stats: PolicyStats;
}

interface RaciAssignment {
  id: string;
  activity: string;
  lifecyclePhase: string;
  layer: GovernanceLayer;
  responsible: string[];
  accountable: string | null;
  consulted: string[];
  informed: string[];
  notes: string | null;
  sortOrder: number;
}

interface RaciResponse {
  assignments: RaciAssignment[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const DOC_TYPE_ORDER: PolicyDocType[] = ["CHARTER", "POLICY", "MANUAL", "STANDARD", "PROCEDURE", "SOP", "GUIDELINE"];

const TYPE_LABELS: Record<PolicyDocType, string> = {
  CHARTER: "Charters",
  POLICY: "Policies",
  MANUAL: "Manuals",
  STANDARD: "Standards",
  PROCEDURE: "Procedures",
  SOP: "SOPs",
  GUIDELINE: "Guidelines",
};

const TYPE_LABEL_SINGULAR: Record<PolicyDocType, string> = {
  CHARTER: "Charter",
  POLICY: "Policy",
  MANUAL: "Manual",
  STANDARD: "Standard",
  PROCEDURE: "Procedure",
  SOP: "SOP",
  GUIDELINE: "Guideline",
};

const DOC_STATUSES: PolicyDocStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "BOARD_APPROVAL_PENDING",
  "APPROVED",
  "PUBLISHED",
  "SUPERSEDED",
  "RETIRED",
];

const STATUS_BADGE: Record<PolicyDocStatus, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  IN_REVIEW: { label: "In Review", variant: "info" },
  BOARD_APPROVAL_PENDING: { label: "Board Approval Pending", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  PUBLISHED: { label: "Published", variant: "success" },
  SUPERSEDED: { label: "Superseded", variant: "outline" },
  RETIRED: { label: "Retired", variant: "outline" },
};

const STATUS_BAR_COLOR: Record<PolicyDocStatus, string> = {
  DRAFT: "bg-muted-foreground/40",
  IN_REVIEW: "bg-blue-500",
  BOARD_APPROVAL_PENDING: "bg-yellow-500",
  APPROVED: "bg-green-500",
  PUBLISHED: "bg-green-500",
  SUPERSEDED: "bg-muted-foreground/25",
  RETIRED: "bg-muted-foreground/25",
};

const LAYERS: GovernanceLayer[] = ["BOARD", "BOARD_COMMITTEE", "EXECUTIVE", "MANAGEMENT", "OPERATIONAL"];

const LAYER_BADGE: Record<GovernanceLayer, { label: string; variant: BadgeVariant }> = {
  BOARD: { label: "Board", variant: "purple" },
  BOARD_COMMITTEE: { label: "Board Committee", variant: "info" },
  EXECUTIVE: { label: "Executive", variant: "warning" },
  MANAGEMENT: { label: "Management", variant: "default" },
  OPERATIONAL: { label: "Operational", variant: "secondary" },
};

const INTEGRATION_LABELS: Record<string, string> = {
  IT_GOVERNANCE: "IT Governance",
  ERM: "ERM",
  MRM: "Model Risk",
  PRIVACY: "Privacy",
  CYBER: "Cyber",
  OUTSOURCING: "Outsourcing",
  INTERNAL_AUDIT: "Internal Audit",
};

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function toDateInput(d: string | null): string {
  return d ? d.slice(0, 10) : "";
}

function parseList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// ── Policy document form ─────────────────────────────────────────────────

interface PolicyFormState {
  docCode: string;
  title: string;
  type: PolicyDocType;
  status: PolicyDocStatus;
  version: string;
  ownerRole: string;
  approverRole: string;
  effectiveFrom: string;
  nextReviewDate: string;
  summary: string;
  content: string;
}

function emptyPolicyForm(): PolicyFormState {
  return {
    docCode: "",
    title: "",
    type: "PROCEDURE",
    status: "DRAFT",
    version: "1.0",
    ownerRole: "",
    approverRole: "",
    effectiveFrom: "",
    nextReviewDate: "",
    summary: "",
    content: "",
  };
}

function toPolicyFormState(doc: PolicyDocument): PolicyFormState {
  return {
    docCode: doc.docCode,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    version: doc.version,
    ownerRole: doc.ownerRole ?? "",
    approverRole: doc.approverRole ?? "",
    effectiveFrom: toDateInput(doc.effectiveFrom),
    nextReviewDate: toDateInput(doc.nextReviewDate),
    summary: doc.summary ?? "",
    content: doc.content ?? "",
  };
}

function PolicyDocumentModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: PolicyDocument | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { post, patch, del } = useApi();
  const { addNotification } = useUIStore();
  const [form, setForm] = useState<PolicyFormState>(() => (doc ? toPolicyFormState(doc) : emptyPolicyForm()));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!doc && !form.docCode.trim()) {
      setError("Document code is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        status: form.status,
        version: form.version.trim() || "1.0",
        ownerRole: form.ownerRole.trim() || null,
        approverRole: form.approverRole.trim() || null,
        effectiveFrom: form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : null,
        nextReviewDate: form.nextReviewDate ? new Date(form.nextReviewDate).toISOString() : null,
        summary: form.summary.trim() || null,
        content: form.content.trim() || null,
      };
      if (doc) {
        await patch(`/policies/${doc.id}`, payload);
        addNotification({ type: "success", title: "Document updated", message: `${doc.docCode} saved.` });
      } else {
        await post("/policies", { ...payload, docCode: form.docCode.trim().toUpperCase(), type: form.type });
        addNotification({
          type: "success",
          title: "Document created",
          message: `${form.docCode.toUpperCase()} added to the policy library.`,
        });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save document.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!doc) return;
    if (!confirm(`Delete "${doc.title}" (${doc.docCode})? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await del(`/policies/${doc.id}`);
      addNotification({ type: "success", title: "Document deleted", message: `${doc.docCode} removed.` });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {doc ? "Edit Document" : "New Document"}
            </CardTitle>
            {doc && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {doc.docCode} · {TYPE_LABEL_SINGULAR[doc.type]}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {!doc && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Document Code *</Label>
                  <Input
                    value={form.docCode}
                    onChange={(e) => set("docCode", e.target.value)}
                    placeholder="e.g. AI-PRO-012"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value as PolicyDocType)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {DOC_TYPE_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABEL_SINGULAR[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={form.version} onChange={(e) => set("version", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as PolicyDocStatus)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {DOC_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_BADGE[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner Role</Label>
                <Input
                  value={form.ownerRole}
                  onChange={(e) => set("ownerRole", e.target.value)}
                  placeholder="e.g. Head of Model Risk"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Approver Role</Label>
                <Input
                  value={form.approverRole}
                  onChange={(e) => set("approverRole", e.target.value)}
                  placeholder="e.g. AI Governance Committee"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Effective From</Label>
                <Input type="date" value={form.effectiveFrom} onChange={(e) => set("effectiveFrom", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Review Date</Label>
                <Input
                  type="date"
                  value={form.nextReviewDate}
                  onChange={(e) => set("nextReviewDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea
                rows={3}
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="One-paragraph summary of scope and purpose"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                rows={8}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="Full document text, or a structured outline of its sections"
                className="font-mono text-xs"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3 pt-1">
              {doc && (
                <Button type="button" variant="destructive" size="default" onClick={handleDelete} disabled={deleting || saving}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : doc ? (
                  "Save Changes"
                ) : (
                  "Create Document"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── RACI assignment form ─────────────────────────────────────────────────

interface RaciFormState {
  activity: string;
  lifecyclePhase: string;
  layer: GovernanceLayer;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
  notes: string;
  sortOrder: string;
}

function emptyRaciForm(): RaciFormState {
  return {
    activity: "",
    lifecyclePhase: LIFECYCLE_PHASES[0],
    layer: "MANAGEMENT",
    responsible: "",
    accountable: "",
    consulted: "",
    informed: "",
    notes: "",
    sortOrder: "0",
  };
}

function toRaciFormState(r: RaciAssignment): RaciFormState {
  return {
    activity: r.activity,
    lifecyclePhase: r.lifecyclePhase,
    layer: r.layer,
    responsible: r.responsible.join(", "),
    accountable: r.accountable ?? "",
    consulted: r.consulted.join(", "),
    informed: r.informed.join(", "),
    notes: r.notes ?? "",
    sortOrder: String(r.sortOrder),
  };
}

function RaciModal({
  assignment,
  onClose,
  onSaved,
}: {
  assignment: RaciAssignment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { post, patch, del } = useApi();
  const { addNotification } = useUIStore();
  const [form, setForm] = useState<RaciFormState>(() => (assignment ? toRaciFormState(assignment) : emptyRaciForm()));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof RaciFormState>(key: K, value: RaciFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.activity.trim() || !form.lifecyclePhase.trim()) {
      setError("Activity and lifecycle phase are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        activity: form.activity.trim(),
        lifecyclePhase: form.lifecyclePhase.trim(),
        layer: form.layer,
        responsible: parseList(form.responsible),
        accountable: form.accountable.trim() || null,
        consulted: parseList(form.consulted),
        informed: parseList(form.informed),
        notes: form.notes.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (assignment) {
        await patch(`/raci/${assignment.id}`, payload);
        addNotification({ type: "success", title: "Assignment updated", message: form.activity });
      } else {
        await post("/raci", payload);
        addNotification({ type: "success", title: "Assignment added", message: form.activity });
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!assignment) return;
    if (!confirm(`Remove "${assignment.activity}" from the RACI matrix?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await del(`/raci/${assignment.id}`);
      addNotification({ type: "success", title: "Assignment removed", message: assignment.activity });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" />
            {assignment ? "Edit RACI Assignment" : "New RACI Assignment"}
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Activity *</Label>
              <Input value={form.activity} onChange={(e) => set("activity", e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lifecycle Phase *</Label>
                <Input
                  list="lifecycle-phases"
                  value={form.lifecyclePhase}
                  onChange={(e) => set("lifecyclePhase", e.target.value)}
                  placeholder="e.g. Validate & Approve"
                  required
                />
                <datalist id="lifecycle-phases">
                  {LIFECYCLE_PHASES.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>Governance Layer</Label>
                <select
                  value={form.layer}
                  onChange={(e) => set("layer", e.target.value as GovernanceLayer)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {LAYERS.map((l) => (
                    <option key={l} value={l}>
                      {LAYER_BADGE[l].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Responsible (R) — comma-separated</Label>
              <Input
                value={form.responsible}
                onChange={(e) => set("responsible", e.target.value)}
                placeholder="e.g. Product Owner, Head of Model Risk"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Accountable (A) — one name</Label>
              <Input
                value={form.accountable}
                onChange={(e) => set("accountable", e.target.value)}
                placeholder="e.g. Chief Risk Officer"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Consulted (C) — comma-separated</Label>
              <Input
                value={form.consulted}
                onChange={(e) => set("consulted", e.target.value)}
                placeholder="e.g. Legal, Data Protection Officer"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Informed (I) — comma-separated</Label>
              <Input
                value={form.informed}
                onChange={(e) => set("informed", e.target.value)}
                placeholder="e.g. AI Governance Committee"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-3 pt-1">
              {assignment && (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting || saving}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : assignment ? (
                  "Save Changes"
                ) : (
                  "Add Assignment"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section status bar (mini coverage indicator per document-type group) ──

function GroupStatusBar({ docs }: { docs: PolicyDocument[] }) {
  if (docs.length === 0) return null;
  const counts: Record<PolicyDocStatus, number> = {
    DRAFT: 0,
    IN_REVIEW: 0,
    BOARD_APPROVAL_PENDING: 0,
    APPROVED: 0,
    PUBLISHED: 0,
    SUPERSEDED: 0,
    RETIRED: 0,
  };
  docs.forEach((d) => {
    counts[d.status] += 1;
  });
  return (
    <div className="flex h-1.5 w-28 rounded-full overflow-hidden bg-muted shrink-0">
      {DOC_STATUSES.map(
        (s) =>
          counts[s] > 0 && (
            <div
              key={s}
              className={STATUS_BAR_COLOR[s]}
              style={{ width: `${(counts[s] / docs.length) * 100}%` }}
              title={`${STATUS_BADGE[s].label}: ${counts[s]}`}
            />
          )
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const { get, post } = useApi();
  const { addNotification } = useUIStore();

  const [activeTab, setActiveTab] = useState<"library" | "raci">("library");

  // Policy library state
  const [policiesData, setPoliciesData] = useState<PoliciesResponse | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<PolicyDocStatus | "">("");
  const [filterType, setFilterType] = useState<PolicyDocType | "">("");
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PolicyDocument | null>(null);
  const [seeding, setSeeding] = useState(false);

  // RACI state
  const [raciData, setRaciData] = useState<RaciResponse | null>(null);
  const [loadingRaci, setLoadingRaci] = useState(true);
  const [raciModalOpen, setRaciModalOpen] = useState(false);
  const [editingRaci, setEditingRaci] = useState<RaciAssignment | null>(null);

  const fetchPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const res = await get<PoliciesResponse>("/policies");
      setPoliciesData(res);
    } catch {
      // useApi already surfaces an error toast
    } finally {
      setLoadingPolicies(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRaci = useCallback(async () => {
    setLoadingRaci(true);
    try {
      const res = await get<RaciResponse>("/raci");
      setRaciData(res);
    } catch {
      // useApi already surfaces an error toast
    } finally {
      setLoadingRaci(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPolicies();
    fetchRaci();
  }, [fetchPolicies, fetchRaci]);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await post<{ documentsCreated: number; activitiesCreated: number }>("/policies/seed", {});
      addNotification({
        type: "success",
        title: "Framework installed",
        message: `${res.documentsCreated} documents and ${res.activitiesCreated} RACI activities added.`,
      });
      await Promise.all([fetchPolicies(), fetchRaci()]);
    } catch {
      // useApi already surfaces an error toast
    } finally {
      setSeeding(false);
    }
  }

  const filteredDocs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (policiesData?.documents ?? []).filter((d) => {
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterType && d.type !== filterType) return false;
      if (term && !(d.docCode.toLowerCase().includes(term) || d.title.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [policiesData, search, filterStatus, filterType]);

  const hasActiveFilter = search.trim() !== "" || filterStatus !== "" || filterType !== "";

  const groupedRaci = useMemo(() => {
    const g: Record<string, RaciAssignment[]> = {};
    (raciData?.assignments ?? []).forEach((r) => {
      (g[r.lifecyclePhase] ??= []).push(r);
    });
    return g;
  }, [raciData]);

  const orderedPhases = useMemo(() => {
    const known = LIFECYCLE_PHASES as readonly string[];
    const present = Object.keys(groupedRaci);
    const extra = present.filter((p) => !known.includes(p)).sort();
    return [...known, ...extra];
  }, [groupedRaci]);

  const stats = policiesData?.stats ?? { total: 0, published: 0, pendingBoardApproval: 0, dueForReview90: 0 };
  const publishedPct = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">AI Policy Framework — ISO/IEC 42001 &amp; RBI Governance</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The Board-approved document hierarchy and the RACI operating model that puts it into practice — from
            the apex policy down to operating procedures and SOPs, each mapped to Annex A controls and the
            enterprise structures (ERM, MRM, IT governance, cyber, privacy) it plugs into.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "library" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Library className="h-4 w-4" />
          Policy Library
        </button>
        <button
          onClick={() => setActiveTab("raci")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "raci" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network className="h-4 w-4" />
          RACI / Operating Model
        </button>
      </div>

      {/* ── Policy Library tab ──────────────────────────────────────────── */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {loadingPolicies && !policiesData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stats.total === 0 ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-8 text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Library className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Stand up the AI Policy Framework</h3>
                  <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-1">
                    Load the standard, Board-ready document hierarchy — an apex policy, committee charter, AIMS
                    manual, eleven procedures, two standards and a reporting SOP — pre-mapped to ISO/IEC 42001
                    Annex A controls and RBI&apos;s supervisory expectations for AI in financial services. Installs
                    17 documents and a matching 19-activity RACI operating model in one step.
                  </p>
                </div>
                <Button onClick={handleSeed} disabled={seeding} className="gap-2">
                  {seeding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Installing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Load Standard Framework
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stat row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Documents"
                  value={stats.total}
                  subtitle={`${DOC_TYPE_ORDER.length} document types`}
                  icon={Library}
                />
                <StatCard
                  title="Published"
                  value={stats.published}
                  subtitle={`${publishedPct}% of the library`}
                  icon={CheckCircle2}
                  variant="success"
                />
                <StatCard
                  title="Pending Board Approval"
                  value={stats.pendingBoardApproval}
                  subtitle={stats.pendingBoardApproval > 0 ? "Awaiting Board Risk Committee" : "None outstanding"}
                  icon={Landmark}
                  variant={stats.pendingBoardApproval > 0 ? "warning" : "default"}
                />
                <StatCard
                  title="Due for Review (90d)"
                  value={stats.dueForReview90}
                  subtitle={stats.dueForReview90 > 0 ? "Schedule revalidation" : "None due"}
                  icon={CalendarClock}
                  variant={stats.dueForReview90 > 0 ? "danger" : "default"}
                />
              </div>

              {/* Toolbar */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Document Hierarchy
                      <Badge variant="outline" className="text-xs ml-1">
                        {filteredDocs.length} of {stats.total}
                      </Badge>
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={fetchPolicies} disabled={loadingPolicies}>
                        <RefreshCw className={`h-4 w-4 ${loadingPolicies ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingDoc(null);
                          setDocModalOpen(true);
                        }}
                        className="gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> New Document
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search code or title…"
                        className="pl-8 h-8 text-xs w-56"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as PolicyDocStatus | "")}
                        className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All statuses</option>
                        {DOC_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_BADGE[s].label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as PolicyDocType | "")}
                        className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">All types</option>
                        {DOC_TYPE_ORDER.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABEL_SINGULAR[t]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    </div>

                    {hasActiveFilter && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilterStatus("");
                          setFilterType("");
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {DOC_TYPE_ORDER.map((type) => {
                    const docsInGroup = filteredDocs.filter((d) => d.type === type);
                    if (docsInGroup.length === 0 && hasActiveFilter) return null;
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between gap-3 py-2 border-b border-border mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">{TYPE_LABELS[type]}</h3>
                            <Badge variant="outline" className="text-[10px]">
                              {docsInGroup.length}
                            </Badge>
                          </div>
                          <GroupStatusBar docs={docsInGroup} />
                        </div>

                        {docsInGroup.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No documents in this category yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {docsInGroup.map((doc) => (
                              <div
                                key={doc.id}
                                onClick={() => {
                                  setEditingDoc(doc);
                                  setDocModalOpen(true);
                                }}
                                className="border border-border rounded-lg p-3 hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <code className="text-xs font-mono font-semibold text-primary shrink-0">
                                      {doc.docCode}
                                    </code>
                                    <span className="text-sm font-medium">{doc.title}</span>
                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                      v{doc.version}
                                    </Badge>
                                  </div>
                                  <Badge variant={STATUS_BADGE[doc.status].variant} className="shrink-0">
                                    {STATUS_BADGE[doc.status].label}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                  <span>Owner: {doc.ownerRole ?? "Unassigned"}</span>
                                  <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" /> Next review: {fmtDate(doc.nextReviewDate)}
                                  </span>
                                </div>

                                {(doc.integratesWith.length > 0 || doc.frameworkRefs.length > 0) && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {doc.integratesWith.map((t) => (
                                      <span
                                        key={t}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                                      >
                                        {INTEGRATION_LABELS[t] ?? t}
                                      </span>
                                    ))}
                                    {doc.frameworkRefs.map((f) => (
                                      <span
                                        key={f}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground"
                                      >
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredDocs.length === 0 && hasActiveFilter && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No documents match your filters.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── RACI tab ─────────────────────────────────────────────────────── */}
      {activeTab === "raci" && (
        <div className="space-y-6">
          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-semibold">R — Responsible</span>
                  <span className="text-muted-foreground">does the work</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-400" />
                  <span className="font-semibold">A — Accountable</span>
                  <span className="text-muted-foreground">answers for the outcome (one name)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="font-semibold">C — Consulted</span>
                  <span className="text-muted-foreground">two-way input before the decision</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-semibold">I — Informed</span>
                  <span className="text-muted-foreground">kept up to date, one-way</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {raciData?.assignments.length ?? 0} activities across {orderedPhases.filter((p) => (groupedRaci[p]?.length ?? 0) > 0).length} lifecycle phases
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRaci} disabled={loadingRaci}>
                <RefreshCw className={`h-4 w-4 ${loadingRaci ? "animate-spin" : ""}`} />
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRaci(null);
                  setRaciModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Assignment
              </Button>
            </div>
          </div>

          {loadingRaci && !raciData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (raciData?.assignments.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="p-8 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Network className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No RACI assignments yet</h3>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1">
                    Load the standard framework from the Policy Library tab to install the full 19-activity operating
                    model, or add assignments one at a time.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setEditingRaci(null);
                    setRaciModalOpen(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Assignment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px] space-y-6">
                {orderedPhases.map((phase) => {
                  const rows = groupedRaci[phase] ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <Card key={phase}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary" />
                          {phase}
                          <Badge variant="outline" className="text-[10px]">
                            {rows.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="text-left text-muted-foreground border-b border-border">
                              <th className="py-2 pr-3 font-medium">Activity</th>
                              <th className="py-2 pr-3 font-medium w-40">Layer</th>
                              <th className="py-2 pr-3 font-medium">Responsible (R)</th>
                              <th className="py-2 pr-3 font-medium">Accountable (A)</th>
                              <th className="py-2 pr-3 font-medium">Consulted (C)</th>
                              <th className="py-2 pr-3 font-medium">Informed (I)</th>
                              <th className="py-2 pl-1 font-medium w-6" />
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr
                                key={r.id}
                                onClick={() => {
                                  setEditingRaci(r);
                                  setRaciModalOpen(true);
                                }}
                                className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer"
                              >
                                <td className="py-2.5 pr-3 align-top font-medium">{r.activity}</td>
                                <td className="py-2.5 pr-3 align-top">
                                  <Badge variant={LAYER_BADGE[r.layer].variant} className="text-[10px]">
                                    {LAYER_BADGE[r.layer].label}
                                  </Badge>
                                </td>
                                <td className="py-2.5 pr-3 align-top">
                                  <div className="flex flex-wrap gap-1">
                                    {r.responsible.map((n) => (
                                      <span
                                        key={n}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                      >
                                        {n}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 align-top">
                                  {r.accountable && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      {r.accountable}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-3 align-top">
                                  <div className="flex flex-wrap gap-1">
                                    {r.consulted.map((n) => (
                                      <span
                                        key={n}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                      >
                                        {n}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3 align-top">
                                  <div className="flex flex-wrap gap-1">
                                    {r.informed.map((n) => (
                                      <span
                                        key={n}
                                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
                                      >
                                        {n}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2.5 pl-1 align-top text-right">
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {docModalOpen && (
        <PolicyDocumentModal
          doc={editingDoc}
          onClose={() => setDocModalOpen(false)}
          onSaved={() => {
            setDocModalOpen(false);
            fetchPolicies();
          }}
        />
      )}
      {raciModalOpen && (
        <RaciModal
          assignment={editingRaci}
          onClose={() => setRaciModalOpen(false)}
          onSaved={() => {
            setRaciModalOpen(false);
            fetchRaci();
          }}
        />
      )}
    </div>
  );
}
