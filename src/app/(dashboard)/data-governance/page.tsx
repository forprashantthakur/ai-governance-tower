"use client";

import { useEffect, useState } from "react";
import {
  Database, Lock, Eye, ArrowRight, BrainCircuit, AlertTriangle,
  Scan, CheckCircle2, XCircle, ShieldAlert, ChevronDown, Loader2,
  Sparkles, Info,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  models?: { model?: { id: string; name: string; type: string } }[];
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

interface PiiDetectionResult {
  columnName: string;
  normalizedName: string;
  isPii: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  piiCategory: string;
  dpdpCategory: string;
  isSpecialCategory: boolean;
  regulation: string;
  reason: string;
}

interface ScanSummary {
  totalColumns: number;
  piiColumns: number;
  specialCategoryColumns: number;
  highConfidenceMatches: number;
  hasSensitiveData: boolean;
  dpdpObligations: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SENSITIVITY_COLORS: Record<string, string> = {
  PUBLIC: "bg-green-500/15 text-green-400 border-green-500/30",
  INTERNAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CONFIDENTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  RESTRICTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PII: "bg-red-500/15 text-red-400 border-red-500/30",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-400 border-red-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LOW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const PLACEHOLDER = `-- Paste SQL, CSV headers, JSON keys, or plain column names

-- SQL CREATE TABLE example:
CREATE TABLE customers (
  id UUID,
  full_name VARCHAR(200),
  email VARCHAR(255),
  aadhaar_number CHAR(12),
  date_of_birth DATE,
  credit_score INT,
  blood_group VARCHAR(5)
);

-- Or plain column names (one per line):
-- customer_id
-- mobile_phone
-- pan_card`;

// ── Lineage Component ─────────────────────────────────────────────────────────

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
            selected === asset.id
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-border/60"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-muted border border-border text-xs">
              <Database className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="font-medium">{asset.name}</span>
              <span className={`text-[9px] px-1 rounded border ${SENSITIVITY_COLORS[asset.sensitivity] ?? "bg-muted"}`}>
                {asset.sensitivity}
              </span>
              {asset.hasPii && <Lock className="h-3 w-3 text-red-400 shrink-0" />}
            </div>

            {linkedModels.length > 0 ? (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
                    {Math.round((asset.retentionDays / 365) * 10) / 10} years ({asset.retentionDays} days)
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

// ── PII Scanner Component ─────────────────────────────────────────────────────

function PiiScanner({ assets }: { assets: DataAsset[] }) {
  const api = useApi();
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PiiDetectionResult[] | null>(null);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Apply-to-asset state
  const [applyAssetId, setApplyAssetId] = useState("");
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  async function runScan() {
    if (!input.trim()) return;
    setScanning(true);
    setResults(null);
    setSummary(null);
    setError(null);
    setApplySuccess(false);
    try {
      const res = await api.post<{ results: PiiDetectionResult[]; summary: ScanSummary }>(
        "/pii-scanner",
        { input: input.trim() }
      );
      setResults(res.results);
      setSummary(res.summary);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed. Please check your input format.");
    } finally {
      setScanning(false);
    }
  }

  async function applyToAsset() {
    if (!applyAssetId || !results) return;
    const piiFields = results.filter((r) => r.isPii).map((r) => r.columnName);
    const hasPii = piiFields.length > 0;
    const hasSpecial = results.some((r) => r.isSpecialCategory);

    setApplying(true);
    setApplySuccess(false);
    try {
      await api.patch(`/data-assets/${applyAssetId}`, {
        hasPii,
        piiFields,
        ...(hasPii && { sensitivity: hasSpecial ? "RESTRICTED" : "PII" }),
      });
      setApplySuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update data asset.");
    } finally {
      setApplying(false);
    }
  }

  const piiResults = results?.filter((r) => r.isPii) ?? [];
  const cleanResults = results?.filter((r) => !r.isPii) ?? [];

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Supports SQL CREATE TABLE, CSV header rows, JSON objects, or plain column names (one per line or comma-separated)
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={10}
          className="w-full rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        />
      </div>

      <Button onClick={runScan} disabled={scanning || !input.trim()} className="gap-2">
        {scanning ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
        ) : (
          <><Scan className="h-4 w-4" /> Run PII Scan</>
        )}
      </Button>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Columns Scanned", value: summary.totalColumns, highlight: "" },
            {
              label: "PII Detected",
              value: summary.piiColumns,
              highlight: summary.piiColumns > 0 ? "text-red-400" : "text-green-400",
            },
            {
              label: "Special Category",
              value: summary.specialCategoryColumns,
              highlight: summary.specialCategoryColumns > 0 ? "text-orange-400" : "",
            },
            {
              label: "High Confidence",
              value: summary.highConfidenceMatches,
              highlight: summary.highConfidenceMatches > 0 ? "text-yellow-400" : "",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.highlight}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* DPDP obligations */}
      {summary && summary.dpdpObligations.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm">
          <ShieldAlert className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-300 mb-1">DPDP Act 2023 Obligations Triggered</p>
            <ul className="space-y-0.5">
              {summary.dpdpObligations.map((o) => (
                <li key={o} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-yellow-500 mt-0.5">›</span> {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* PII results table */}
      {results && piiResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-400" />
            PII / Sensitive Columns Detected
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">{piiResults.length}</Badge>
          </h3>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Column</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">PII Category</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">DPDP Classification</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Confidence</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Special?</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Regulation Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {piiResults.map((r) => (
                  <tr key={r.columnName} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2">
                      <code className="font-mono font-semibold text-foreground">{r.columnName}</code>
                    </td>
                    <td className="px-3 py-2 text-foreground/80">{r.piiCategory}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.dpdpCategory}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${CONFIDENCE_COLORS[r.confidence]}`}>
                        {r.confidence}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.isSpecialCategory ? (
                        <span className="inline-flex items-center gap-1 text-orange-400">
                          <ShieldAlert className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.regulation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean columns */}
      {results && cleanResults.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 select-none">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
            {cleanResults.length} non-PII column{cleanResults.length !== 1 ? "s" : ""} — click to expand
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
            {cleanResults.map((r) => (
              <code key={r.columnName} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground font-mono">
                {r.columnName}
              </code>
            ))}
          </div>
        </details>
      )}

      {/* No PII found */}
      {results && results.length > 0 && piiResults.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          No PII detected in the {results.length} scanned column{results.length !== 1 ? "s" : ""}.
        </div>
      )}

      {/* Apply to Asset */}
      {results && piiResults.length > 0 && assets.length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Apply Results to a Data Asset
          </p>
          <p className="text-xs text-muted-foreground">
            This will update the selected data asset&apos;s PII fields ({piiResults.length} detected) and automatically set its sensitivity level.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <select
                value={applyAssetId}
                onChange={(e) => { setApplyAssetId(e.target.value); setApplySuccess(false); }}
                className="w-full appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select data asset —</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <Button
              size="sm"
              onClick={applyToAsset}
              disabled={!applyAssetId || applying}
              className="gap-1.5"
            >
              {applying ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying…</>
              ) : (
                "Apply to Asset"
              )}
            </Button>
          </div>
          {applySuccess && (
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Data asset updated — {piiResults.length} PII field{piiResults.length !== 1 ? "s" : ""} saved and sensitivity level set.
            </div>
          )}
        </div>
      )}
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

  const chains: LineageChain[] = assets.map((asset) => ({
    asset,
    linkedModels: (asset.models ?? [])
      .map((link) => link.model)
      .filter(Boolean) as { id: string; name: string; type: string }[],
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
      cell: (row) =>
        row.hasPii ? (
          <div>
            <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/30">
              <Lock className="h-2.5 w-2.5 mr-1" /> PII
            </Badge>
            {(row.piiFields?.length ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {row.piiFields.slice(0, 3).join(", ")}
                {row.piiFields.length > 3 && "…"}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        ),
    },
    {
      key: "retentionDays",
      header: "Retention",
      cell: (row) => {
        const yrs = row.retentionDays
          ? Math.round((row.retentionDays / 365) * 10) / 10
          : null;
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
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">
              {t}
            </span>
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
              {piiAssets.length} PII data asset{piiAssets.length > 1 ? "s" : ""} feeding{" "}
              {modelsWithPii.length} AI model{modelsWithPii.length > 1 ? "s" : ""}. Ensure valid
              consent records and purpose limitation per §6–8 DPDP Act.
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

      {/* PII Auto-Discovery Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scan className="h-4 w-4 text-primary" />
            PII Auto-Discovery Scanner
            <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30 ml-1">DPDP-Aware</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Paste your schema, CSV headers, or column names. The scanner maps each column to DPDP Act 2023
            categories and ISO 29101 privacy classifications — then lets you apply findings directly to a data asset.
          </p>
        </CardHeader>
        <CardContent>
          <PiiScanner assets={assets} />
        </CardContent>
      </Card>

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
