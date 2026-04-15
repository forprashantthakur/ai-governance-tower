"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search, RefreshCw, Tag, UserCheck, ChevronDown, Bell, CheckCircle2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { DataTable, type Column } from "@/components/shared/data-table";
import { RiskBadge, StatusBadge } from "@/components/shared/risk-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddModelModal } from "@/components/models/add-model-modal";
import { ModelDetailDrawer } from "@/components/models/model-detail-drawer";
import { EvidenceUpload } from "@/components/shared/evidence-upload";
import { formatDateShort } from "@/lib/utils";
import type { AIModel, RiskLevel, AuthUser } from "@/types";

interface ModelsResponse {
  models: AIModel[];
  pagination: { page: number; pages: number; total: number; limit: number };
}

type UserOption = Pick<AuthUser, "id" | "name" | "email">;

const REASSESS_DAYS = 180; // flag models not assessed in this many days

function needsReassessment(model: AIModel & { requiresReassessment?: boolean; riskAssessments?: { createdAt: string }[] }): boolean {
  if (model.requiresReassessment) return true;
  const lastAssessment = model.riskAssessments?.[0];
  if (!lastAssessment) return true; // never assessed
  const daysSince = (Date.now() - new Date(lastAssessment.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > REASSESS_DAYS;
}

export default function ModelsPage() {
  const api = useApi();
  const [response, setResponse] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const savingRef = useRef<Record<string, boolean>>({});

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
      });
      const data = await api.get<ModelsResponse>(`/models?${params}`);
      setResponse(data);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  useEffect(() => {
    api.get<UserOption[]>("/users").then(setUsers).catch(() => {});
  }, []);

  async function flagReassessment(modelId: string, flag: boolean) {
    await api.patch(`/models/${modelId}`, { requiresReassessment: flag, reassessmentReason: flag ? "Flagged for manual review" : undefined });
    fetchModels();
  }

  async function setApprover(modelId: string, approverId: string | null) {
    if (savingRef.current[modelId]) return;
    savingRef.current[modelId] = true;
    try {
      await api.patch(`/models/${modelId}`, { approverId });
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              models: prev.models.map((m) =>
                m.id === modelId
                  ? {
                      ...m,
                      approverId,
                      approver: users.find((u) => u.id === approverId) ?? null,
                    }
                  : m
              ),
            }
          : prev
      );
    } finally {
      savingRef.current[modelId] = false;
    }
  }

  const columns: Column<AIModel>[] = [
    {
      key: "name",
      header: "Model Name",
      sortable: true,
      cell: (row) => (
        <div>
          <button
            className="font-medium hover:text-primary transition-colors text-left"
            onClick={() => setSelectedModel(row)}
          >
            {row.name}
          </button>
          <p className="text-xs text-muted-foreground">{row.version}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (row) => (
        <Badge variant="outline" className="text-xs">{row.type}</Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.owner?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "risk",
      header: "Risk Level",
      cell: (row) => {
        const latest = row.riskAssessments?.[0];
        return latest ? (
          <div className="flex items-center gap-2">
            <RiskBadge level={latest.riskLevel as RiskLevel} />
            <span className="text-xs text-muted-foreground">
              {latest.overallScore.toFixed(1)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Not assessed</span>
        );
      },
    },
    {
      key: "status" as keyof AIModel,
      header: "Reassessment",
      cell: (row) => {
        const needs = needsReassessment(row as AIModel & { requiresReassessment?: boolean; riskAssessments?: { createdAt: string }[] });
        const flagged = (row as AIModel & { requiresReassessment?: boolean }).requiresReassessment;
        if (!needs) {
          return (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Up to date
            </span>
          );
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); flagReassessment(row.id, !flagged); }}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
              flagged
                ? "border-orange-500/40 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
                : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20"
            }`}
            title={flagged ? "Click to clear reassessment flag" : "Click to flag for reassessment"}
          >
            <Bell className="h-2.5 w-2.5" />
            {flagged ? "Flagged" : "Needs Review"}
          </button>
        );
      },
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-muted-foreground max-w-[180px] block truncate" title={row.description ?? ""}>
          {row.description || <span className="italic opacity-40">—</span>}
        </span>
      ),
    },
    {
      key: "trainingDataset" as keyof AIModel,
      header: "Dataset",
      cell: (row) => {
        const ds = (row as AIModel & { trainingDataset?: string }).trainingDataset;
        return (
          <span className="text-xs text-muted-foreground max-w-[140px] block truncate" title={ds ?? ""}>
            {ds || <span className="italic opacity-40">—</span>}
          </span>
        );
      },
    },
    {
      key: "accuracyScore" as keyof AIModel,
      header: "Accuracy",
      cell: (row) => {
        const acc = (row as AIModel & { accuracyScore?: number }).accuracyScore;
        if (acc == null) return <span className="text-xs italic opacity-40">—</span>;
        const pct = Math.round(acc * 100);
        const color = pct >= 90 ? "text-green-400" : pct >= 75 ? "text-amber-400" : "text-red-400";
        return <span className={`text-xs font-semibold ${color}`}>{pct}%</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "tags",
      header: "Tags",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.isPiiProcessing && (
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30">
              <Tag className="h-2.5 w-2.5" /> PII
            </span>
          )}
          {row.isFinancial && (
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
              <Tag className="h-2.5 w-2.5" /> Financial
            </span>
          )}
          {row.isCritical && (
            <span className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] bg-red-500/15 text-red-400 border-red-500/30">
              <Tag className="h-2.5 w-2.5" /> Critical
            </span>
          )}
          {!row.isPiiProcessing && !row.isFinancial && !row.isCritical && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDateShort(row.createdAt)}
        </span>
      ),
    },
    {
      key: "approverId" as keyof AIModel,
      header: "Project Approver",
      cell: (row) => (
        <div className="relative flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <select
            value={(row as AIModel).approverId ?? ""}
            onChange={(e) => setApprover(row.id, e.target.value || null)}
            className="appearance-none bg-transparent text-sm pr-5 cursor-pointer hover:text-primary focus:outline-none focus:text-primary text-foreground min-w-[90px]"
          >
            <option value="">— Select —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <ChevronDown className="h-3 w-3 text-muted-foreground pointer-events-none absolute right-0" />
        </div>
      ),
    },
    {
      key: "id",
      header: "Approval Evidence",
      cell: (row) => (
        <EvidenceUpload
          modelId={row.id}
          section="approval"
          compact
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="pl-9 w-64"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchModels} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
        </div>
      </div>

      {/* Reassessment alert banner */}
      {response && (() => {
        const needsReview = response.models.filter((m) =>
          needsReassessment(m as AIModel & { requiresReassessment?: boolean; riskAssessments?: { createdAt: string }[] })
        ).length;
        if (needsReview === 0) return null;
        return (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-orange-500/30 bg-orange-500/5 text-sm">
            <Bell className="h-4 w-4 text-orange-400 shrink-0" />
            <p className="text-orange-300">
              <span className="font-semibold">{needsReview} model{needsReview > 1 ? "s" : ""}</span>
              {" "}require reassessment — either never assessed or last reviewed more than {REASSESS_DAYS} days ago.
            </p>
          </div>
        );
      })()}

      {/* Stats strip */}
      {response && (
        <p className="text-sm text-muted-foreground">
          {response.pagination.total} model{response.pagination.total !== 1 ? "s" : ""} registered
        </p>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={response?.models ?? []}
        loading={loading}
        emptyMessage="No AI models registered yet. Add your first model."
        pagination={
          response
            ? {
                ...response.pagination,
                onPageChange: setPage,
              }
            : undefined
        }
      />

      {/* Modals */}
      {showAddModal && (
        <AddModelModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchModels(); }}
        />
      )}
      {selectedModel && (
        <ModelDetailDrawer
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onRefresh={fetchModels}
        />
      )}
    </div>
  );
}
