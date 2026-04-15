"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, Plus, RefreshCw, Search, CheckCircle2, XCircle,
  Clock, AlertTriangle, X, ChevronDown, Loader2, FileText,
  Filter, Database, Calendar,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/shared/data-table";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsentStatus = "GRANTED" | "REVOKED" | "PENDING" | "EXPIRED";
type ConsentType   = "DATA_PROCESSING" | "AI_DECISION" | "DATA_SHARING" | "MARKETING";

interface DataAssetOption {
  id: string;
  name: string;
  sensitivity: string;
  hasPii: boolean;
}

interface ConsentRecord {
  id: string;
  dataAssetId: string;
  subjectId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  grantedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  ipAddress: string | null;
  createdAt: string;
  dataAsset: { id: string; name: string; sensitivity: string; hasPii: boolean };
}

interface ConsentResponse {
  records: ConsentRecord[];
  total: number;
  page: number;
  pages: number;
  summary: Record<ConsentStatus, number>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ConsentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  GRANTED:  { label: "Granted",  color: "bg-green-500/15 text-green-400 border-green-500/30",  icon: <CheckCircle2 className="h-3 w-3" /> },
  REVOKED:  { label: "Revoked",  color: "bg-red-500/15 text-red-400 border-red-500/30",        icon: <XCircle className="h-3 w-3" /> },
  PENDING:  { label: "Pending",  color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  EXPIRED:  { label: "Expired",  color: "bg-muted text-muted-foreground border-border",         icon: <AlertTriangle className="h-3 w-3" /> },
};

const TYPE_LABELS: Record<ConsentType, string> = {
  DATA_PROCESSING: "Data Processing",
  AI_DECISION:     "AI Decision-Making",
  DATA_SHARING:    "Data Sharing",
  MARKETING:       "Marketing",
};

const TYPE_COLORS: Record<ConsentType, string> = {
  DATA_PROCESSING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  AI_DECISION:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
  DATA_SHARING:    "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MARKETING:       "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(record: ConsentRecord) {
  if (!record.expiresAt) return false;
  return new Date(record.expiresAt) < new Date();
}

// ── Add Consent Modal ─────────────────────────────────────────────────────────

function AddConsentModal({
  assets,
  onClose,
  onSuccess,
}: {
  assets: DataAssetOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const api = useApi();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    dataAssetId:  "",
    subjectId:    "",
    consentType:  "DATA_PROCESSING" as ConsentType,
    status:       "GRANTED" as ConsentStatus,
    expiresAt:    "",
    ipAddress:    "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dataAssetId || !form.subjectId) {
      setError("Data asset and Subject ID are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/consent", {
        ...form,
        expiresAt:  form.expiresAt  ? new Date(form.expiresAt).toISOString()  : undefined,
        ipAddress:  form.ipAddress  || undefined,
      });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create consent record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">New Consent Record</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {/* DPDP note */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Under DPDP Act 2023 §6, consent must be free, specific, informed, and unambiguous. Record the data principal's identifier and consent scope.</span>
          </div>

          {/* Data Asset */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Data Asset <span className="text-red-400">*</span></label>
            <div className="relative">
              <select
                value={form.dataAssetId}
                onChange={(e) => set("dataAssetId", e.target.value)}
                className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="">— Select data asset —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Subject ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Data Principal / Subject ID <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="e.g. user_9f3a2c, CUST-00123, hashed email"
              value={form.subjectId}
              onChange={(e) => set("subjectId", e.target.value)}
              required
            />
            <p className="text-[10px] text-muted-foreground">Use a pseudonymous identifier — avoid storing raw PII as the subject key.</p>
          </div>

          {/* Consent Type + Status (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Consent Type</label>
              <div className="relative">
                <select
                  value={form.consentType}
                  onChange={(e) => set("consentType", e.target.value)}
                  className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="DATA_PROCESSING">Data Processing (§6)</option>
                  <option value="AI_DECISION">AI Decision-Making (§7)</option>
                  <option value="DATA_SHARING">Data Sharing (§8)</option>
                  <option value="MARKETING">Marketing</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Initial Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="GRANTED">Granted</option>
                  <option value="PENDING">Pending</option>
                  <option value="REVOKED">Revoked</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Expiry + IP (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Expires At (optional)</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">IP Address (optional)</label>
              <Input
                placeholder="e.g. 192.168.1.1"
                value={form.ipAddress}
                onChange={(e) => set("ipAddress", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Record Consent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConsentPage() {
  const api = useApi();

  const [data, setData]           = useState<ConsentResponse | null>(null);
  const [assets, setAssets]       = useState<DataAssetOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState<ConsentStatus | "">("");
  const [filterType,   setFilterType]   = useState<ConsentType | "">("");
  const [filterAsset,  setFilterAsset]  = useState("");
  const [revoking, setRevoking]   = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(filterStatus && { status: filterStatus }),
        ...(filterType   && { type: filterType }),
        ...(filterAsset  && { assetId: filterAsset }),
      });
      const res = await api.get<ConsentResponse>(`/consent?${params}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType, filterAsset]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    api.get<{ assets: DataAssetOption[] }>("/data-assets")
      .then((r) => setAssets(r.assets ?? []))
      .catch(() => {});
  }, []);

  async function revokeConsent(id: string) {
    setRevoking(id);
    try {
      await api.patch(`/consent/${id}`, { status: "REVOKED" });
      fetchRecords();
    } finally {
      setRevoking(null);
    }
  }

  async function grantConsent(id: string) {
    setRevoking(id);
    try {
      await api.patch(`/consent/${id}`, { status: "GRANTED" });
      fetchRecords();
    } finally {
      setRevoking(null);
    }
  }

  // Client-side subject search filter
  const displayRecords = (data?.records ?? []).filter((r) =>
    search ? r.subjectId.toLowerCase().includes(search.toLowerCase()) : true
  );

  const summary = data?.summary ?? { GRANTED: 0, REVOKED: 0, PENDING: 0, EXPIRED: 0 };
  const total   = data?.total ?? 0;

  const columns: Column<ConsentRecord>[] = [
    {
      key: "dataAssetId",
      header: "Data Asset",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-sm font-medium">{row.dataAsset?.name ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "subjectId",
      header: "Data Principal",
      cell: (row) => (
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
          {row.subjectId}
        </code>
      ),
    },
    {
      key: "consentType",
      header: "Consent Type",
      cell: (row) => (
        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[row.consentType]}`}>
          {TYPE_LABELS[row.consentType]}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status];
        const expired = isExpired(row) && row.status === "GRANTED";
        return (
          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${expired ? STATUS_CONFIG.EXPIRED.color : cfg.color}`}>
            {expired ? STATUS_CONFIG.EXPIRED.icon : cfg.icon}
            {expired ? "Expired" : cfg.label}
          </span>
        );
      },
    },
    {
      key: "grantedAt",
      header: "Granted",
      cell: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {fmt(row.grantedAt)}
        </span>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      cell: (row) => {
        if (!row.expiresAt) return <span className="text-xs text-muted-foreground">No expiry</span>;
        const past = new Date(row.expiresAt) < new Date();
        return (
          <span className={`text-xs flex items-center gap-1 ${past ? "text-orange-400" : "text-muted-foreground"}`}>
            <Calendar className="h-3 w-3" /> {fmt(row.expiresAt)}
          </span>
        );
      },
    },
    {
      key: "revokedAt",
      header: "Revoked",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{fmt(row.revokedAt)}</span>
      ),
    },
    {
      key: "id",
      header: "Action",
      cell: (row) => {
        const busy = revoking === row.id;
        if (row.status === "GRANTED") {
          return (
            <button
              onClick={() => revokeConsent(row.id)}
              disabled={busy}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <XCircle className="h-2.5 w-2.5" />}
              Revoke
            </button>
          );
        }
        if (row.status === "REVOKED" || row.status === "PENDING") {
          return (
            <button
              onClick={() => grantConsent(row.id)}
              disabled={busy}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
              Re-grant
            </button>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* DPDP Header Banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-primary">Consent Management — DPDP Act 2023 §6–9</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track, grant, and revoke data principal consent for each data asset and AI processing activity.
            Consent must be specific, informed, and revocable at any time (§6). Withdrawal is as easy as granting it (§6(4)).
          </p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["GRANTED", "REVOKED", "PENDING", "EXPIRED"] as ConsentStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Card
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`cursor-pointer transition-colors ${filterStatus === s ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <span className={`inline-flex items-center rounded border px-1 py-0.5 text-[9px] ${cfg.color}`}>
                    {cfg.icon}
                  </span>
                </div>
                <p className="text-2xl font-bold">{summary[s]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compliance insight */}
      {summary.EXPIRED > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-orange-500/30 bg-orange-500/5 text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs">
            <span className="font-semibold text-orange-300">{summary.EXPIRED} expired consent record{summary.EXPIRED !== 1 ? "s" : ""}</span> — under DPDP §6(3), processing must stop when consent expires. Review and re-obtain or stop the processing activity.
          </p>
        </div>
      )}

      {summary.REVOKED > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm">
          <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs">
            <span className="font-semibold text-red-300">{summary.REVOKED} revoked consent{summary.REVOKED !== 1 ? "s" : ""}</span> — data principal has withdrawn consent. Ensure processing has ceased and erasure requests (DPDP §13) are handled within 30 days.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Consent Records
              {total > 0 && (
                <Badge variant="outline" className="text-xs ml-1">{total} total</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> New Consent
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-2">
            {/* Subject search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search subject ID…"
                className="pl-8 h-8 text-xs w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as ConsentStatus | ""); setPage(1); }}
                className="appearance-none bg-background border border-border rounded-md pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All statuses</option>
                <option value="GRANTED">Granted</option>
                <option value="REVOKED">Revoked</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value as ConsentType | ""); setPage(1); }}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All types</option>
                <option value="DATA_PROCESSING">Data Processing</option>
                <option value="AI_DECISION">AI Decision-Making</option>
                <option value="DATA_SHARING">Data Sharing</option>
                <option value="MARKETING">Marketing</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Asset filter */}
            <div className="relative">
              <select
                value={filterAsset}
                onChange={(e) => { setFilterAsset(e.target.value); setPage(1); }}
                className="appearance-none bg-background border border-border rounded-md px-3 pr-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All data assets</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            {/* Clear filters */}
            {(filterStatus || filterType || filterAsset || search) && (
              <button
                onClick={() => { setFilterStatus(""); setFilterType(""); setFilterAsset(""); setSearch(""); setPage(1); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded border border-border hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <DataTable
            columns={columns}
            data={displayRecords}
            loading={loading}
            emptyMessage="No consent records yet. Click 'New Consent' to record your first data principal consent."
            pagination={
              data
                ? { page: data.page, pages: data.pages, total: data.total, limit: 20, onPageChange: setPage }
                : undefined
            }
          />
        </CardContent>
      </Card>

      {/* Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            DPDP Act 2023 — Consent Obligations Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { section: "§6(1)", title: "Valid Consent", desc: "Must be free, specific, informed, and unambiguous. Obtained before or at time of processing." },
              { section: "§6(3)", title: "Purpose Limitation", desc: "Consent is valid only for the stated purpose. Cannot process for a different purpose without fresh consent." },
              { section: "§6(4)", title: "Right to Withdraw", desc: "Data principal can withdraw consent at any time. Withdrawal must be as easy as granting it." },
              { section: "§7",   title: "Legitimate Uses", desc: "Certain processing (state functions, medical emergency, employment) may not require consent." },
              { section: "§8",   title: "Obligations on Fiduciary", desc: "Must maintain accuracy, keep only what's needed, implement security safeguards, and erase upon withdrawal." },
              { section: "§13",  title: "Right to Erasure", desc: "Data principal may request erasure of personal data. Fiduciary must comply within 30 days." },
            ].map((item) => (
              <div key={item.section} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <span className="text-xs font-mono font-bold text-primary shrink-0 mt-0.5">{item.section}</span>
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showAdd && (
        <AddConsentModal
          assets={assets}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchRecords(); }}
        />
      )}
    </div>
  );
}
