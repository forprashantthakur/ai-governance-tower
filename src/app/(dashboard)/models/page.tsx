"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, RefreshCw, Tag, UserCheck } from "lucide-react";
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
import type { AIModel, RiskLevel } from "@/types";

interface ModelsResponse {
  models: AIModel[];
  pagination: { page: number; pages: number; total: number; limit: number };
}

export default function ModelsPage() {
  const api = useApi();
  const [response, setResponse] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

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
      key: "owner",
      header: "Project Approver",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm">{row.owner?.name ?? "—"}</span>
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
