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
  // included by API
  models?: {
    model?: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  _count?: { consentRecords: number };
}

interface ModelSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  isPiiProcessing: boolean;
  isCritical: boolean;
  _count?: { agents: number; promptLogs: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SENSITIVITY_COLORS: Record<string, string> = {
  PUBLIC: "bg-green-500/15 text-green-400 border-green-500/30",
  INTERNAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CONFIDENTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  RESTRICTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PII: "bg-red-500/15 text-red-400 border-red-500/30",
};

// ── Lineage — built from asset → linked models ────────────────────────────────

interface LineageChain {
  asset: DataAsset;
  linkedModels: { id: string; name: string; type: string }[];
}

function LineageFlow({ chains }: { chains: LineageChain[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (chains.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
        No lineage data yet. Link data assets to AI models to see the flow here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {chains.map(({ asset, linkedModels }) => (
        <div
          key={asset.id}
          onClick={() => setSelected(selected === asset.id ? null : asset.id)}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selected === asset.id ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/60"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {/* Data Asset node */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-muted border border-border text-xs">
              <Database className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="font-medium">{asset.name}</span>
              <span className={`text-[9px] px-1 rounded border ${SENSITIVITY_COLORS[asset.sensitivity] ?? "bg-muted"}`}>
                {asset.sensitivity}
              </span>
              {asset.hasPii && (
                <Lock className="h-3 w-3 text-red-400 shrink-0" />
              )}
            </div>

            {linkedModels.length > 0 ? (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                {/* Linked AI Models */}
                <div className="flex flex-wrap gap-1.5">
                  {linkedModels.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-primary/10 border border-primary/30 text-xs">
                      <BrainCircuit className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-primary">{m.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 h-4 border-primary/30">{m.type}</Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs text-muted-foreground italic">No linked models</span>
              </>
            )}
          </div>

          {/* Expanded detail */}
          {selected === asset.id && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Source</p>
                <p className="font-medium">{asset.source}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Type</p>
                <p className="font-medium">{asset.dataType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">PII Fields</p>
                <p className="font-medium">
                  {asset.piiFields?.length > 0 ? asset.piiFields.slice(0, 4).join(", ") : "None"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Consent Records</p>
                <p className="font-medium">{asset._count?.consentRecords ?? 0}</p>
              </div>
              {asset.retentionDays && (
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Retention Period</p>
                  <p className={`font-medium ${asset.retentionDays > 365 * 5 ? "text-orange-400" : ""}`}>
                    {Math.round(asset.retentionDays / 365 * 10) / 10} years ({asset.retentionDays} days)
                    {asset.retentionDays > 365 * 5 && " — exceeds 5yr, review DPDP retention policy"}
                  </p>
                </div>
              )}
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
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ assets: DataAsset[] }>("/data-assets")
        .then((r) => r.assets ?? [])
        .catch(() => []),
      api.get<{ models: ModelSummary[] }>("/models?limit=50")
        .then((r) => r.models ?? [])
        .catch(() => []),
    ])
      .then(([a, m]) => {
        setAssets(a);
        setModels(m);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build lineage chains from assets that have linked models
  const chains: LineageChain[] = assets.map((asset) => ({
    asset,
    linkedModels: (asset.models ?? []).map((link) => link.model).filter(Boolean) as { id: string; name: string; type: string }[],
  }));

  const piiAssets = assets.filter((a) => a.hasPii);
  const modelsWithPii = models.filter((m) => m.isPiiProcessing);
  const retentionRisk = assets.filter((a) => (a.retentionDays ?? 0) > 365 * 5);
  const linkedAssets = chains.filter((c) => c.linkedModels.length > 0).length;

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
            {(row.piiFields?.length ?? 0) > 0 && (
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
          <span className={`text-sm ${(row.retentionDays ?? 0) > 365 * 5 ? "text-orange-400" : ""}`}>
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
          {(row.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">{t}</span>
          ))}
        </div>
      ),
    },
    {
      key: "id",
      header: "Linked Models",
      cell: (row) => {
        const linked = (row.models ?? []).length;
        return (
          <span className={`text-xs ${linked > 0 ? "text-primary font-medium" : "text-muted-foreground"}`}>
            {linked > 0 ? `${linked} model${linked > 1 ? "s" : ""}` : "None"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* DPDP compliance alert */}
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Data Assets", value: assets.length },
          { label: "PII Assets", value: piiAssets.length },
          { label: "Linked to AI Models", value: linkedAssets },
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

      {/* Data Lineage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Data Lineage — Assets → AI Models
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <LineageFlow chains={chains} />
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
