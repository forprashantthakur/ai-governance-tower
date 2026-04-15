"use client";

import { useEffect, useState } from "react";
import { Database, Lock, Eye, ArrowRight, Bot, BrainCircuit, AlertTriangle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataAsset {
  id: string;
  name: string;
  source: string;
  dataType: string;
  sensitivity: string;
  hasPii: boolean;
  piiFields: string[];
  retentionDays?: number;
  owner?: string;
  tags: string[];
  createdAt: string;
}

interface LinkedModel {
  id: string;
  name: string;
  type: string;
  status: string;
  isPiiProcessing: boolean;
  isCritical: boolean;
  agents: { id: string; name: string; status: string }[];
  dataAssets: { dataAsset: { id: string; name: string; sensitivity: string } }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SENSITIVITY_COLORS: Record<string, string> = {
  PUBLIC: "bg-green-500/15 text-green-400 border-green-500/30",
  INTERNAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CONFIDENTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  RESTRICTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PII: "bg-red-500/15 text-red-400 border-red-500/30",
};

const STATUS_DOT: Record<string, string> = {
  RUNNING: "bg-green-400",
  IDLE: "bg-slate-400",
  SUSPENDED: "bg-amber-400",
  ERROR: "bg-red-400",
};

// ── Real Lineage Visualization ────────────────────────────────────────────────

function LineageFlow({ models }: { models: LinkedModel[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Build lineage chains: DataAsset → Model → Agents
  const chains = models
    .filter((m) => m.dataAssets.length > 0 || m.agents.length > 0)
    .slice(0, 8);

  if (chains.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No lineage data yet. Link data assets to models to see the flow.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chains.map((model) => (
        <div
          key={model.id}
          className={`p-3 rounded-lg border transition-colors cursor-pointer ${
            selected === model.id ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
          }`}
          onClick={() => setSelected(selected === model.id ? null : model.id)}
        >
          {/* Compact view */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Data sources */}
            {model.dataAssets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {model.dataAssets.map(({ dataAsset }) => (
                  <div key={dataAsset.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted border border-border text-xs">
                    <Database className="h-3 w-3 text-blue-400" />
                    <span className="font-medium">{dataAsset.name}</span>
                    <span className={`text-[9px] px-1 rounded ${SENSITIVITY_COLORS[dataAsset.sensitivity] ?? ""}`}>
                      {dataAsset.sensitivity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-1 rounded bg-muted border border-dashed border-border text-xs text-muted-foreground">
                <Database className="h-3 w-3 inline mr-1" />No linked assets
              </div>
            )}

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* AI Model */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium ${
              model.isCritical ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-primary/10 border-primary/30 text-primary"
            }`}>
              <BrainCircuit className="h-3.5 w-3.5" />
              <span>{model.name}</span>
              <Badge variant="outline" className="text-[9px] px-1 h-4">{model.type}</Badge>
              {model.isPiiProcessing && <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-400">PII</span>}
            </div>

            {model.agents.length > 0 && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                {/* Agents */}
                <div className="flex flex-wrap gap-1.5">
                  {model.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted border border-border text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[agent.status] ?? "bg-slate-400"}`} />
                      <Bot className="h-3 w-3 text-teal-400" />
                      <span>{agent.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expanded detail */}
          {selected === model.id && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <p className="font-medium">{model.status.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">PII Processing</p>
                <p className={`font-medium ${model.isPiiProcessing ? "text-red-400" : "text-green-400"}`}>
                  {model.isPiiProcessing ? "Yes — DPDP applies" : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Critical System</p>
                <p className={`font-medium ${model.isCritical ? "text-orange-400" : "text-slate-400"}`}>
                  {model.isCritical ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Active Agents</p>
                <p className="font-medium">{model.agents.filter((a) => a.status === "RUNNING").length}/{model.agents.length} running</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DataGovernancePage() {
  const api = useApi();
  const [assets, setAssets] = useState<DataAsset[]>([]);
  const [models, setModels] = useState<LinkedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ assets: DataAsset[] }>("/data-assets").then((r) => r.assets ?? []).catch(() => []),
      api.get<{ models: LinkedModel[] }>("/models?limit=50").then((r) => r.models ?? []).catch(() => []),
    ])
      .then(([a, m]) => {
        setAssets(a);
        setModels(m);
      })
      .finally(() => setLoading(false));
  }, []);

  const piiAssets = assets.filter((a) => a.hasPii);
  const retentionRisk = assets.filter((a) => (a.retentionDays ?? 0) > 365 * 5);
  const modelsWithPii = models.filter((m) => m.isPiiProcessing);

  const assetColumns: Column<DataAsset>[] = [
    {
      key: "name",
      header: "Data Asset",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.source}</p>
        </div>
      ),
    },
    {
      key: "dataType",
      header: "Type",
      cell: (row) => <Badge variant="outline" className="text-xs">{row.dataType}</Badge>,
    },
    {
      key: "sensitivity",
      header: "Sensitivity",
      cell: (row) => (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${SENSITIVITY_COLORS[row.sensitivity] ?? "bg-muted"}`}>
          {row.sensitivity}
        </span>
      ),
    },
    {
      key: "hasPii",
      header: "PII",
      cell: (row) => (
        row.hasPii ? (
          <div>
            <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/30">
              <Lock className="h-2.5 w-2.5 mr-1" /> PII
            </Badge>
            {row.piiFields.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {row.piiFields.slice(0, 3).join(", ")}{row.piiFields.length > 3 && "…"}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )
      ),
    },
    {
      key: "retentionDays",
      header: "Retention",
      cell: (row) => {
        const yrs = row.retentionDays ? Math.round(row.retentionDays / 365 * 10) / 10 : null;
        return (
          <span className={`text-sm ${row.retentionDays && row.retentionDays > 365 * 5 ? "text-orange-400" : ""}`}>
            {yrs ? `${yrs} yr${yrs !== 1 ? "s" : ""}` : "Indefinite"}
          </span>
        );
      },
    },
    {
      key: "tags",
      header: "Tags",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">{t}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* DPDP compliance alerts */}
      {piiAssets.length > 0 && modelsWithPii.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-300">DPDP Act 2023 Obligations Active</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {piiAssets.length} PII data asset{piiAssets.length > 1 ? "s" : ""} feeding {modelsWithPii.length} AI model{modelsWithPii.length > 1 ? "s" : ""}. Ensure valid consent records and purpose limitation per §6–8 DPDP Act.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Data Assets", value: assets.length },
          { label: "PII Assets", value: piiAssets.length },
          { label: "AI Models Using PII", value: modelsWithPii.length },
          { label: "Long-Retention (5yr+)", value: retentionRisk.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Lineage — Real */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Data Lineage — Assets → Models → Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : (
            <LineageFlow models={models} />
          )}
        </CardContent>
      </Card>

      {/* Data Asset Registry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Data Asset Registry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={assetColumns}
            data={assets}
            loading={loading}
            emptyMessage="No data assets registered yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
