"use client";

import { useEffect, useState } from "react";
import { Database, Lock, Eye } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/utils";

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

interface ConsentRecord {
  id: string;
  subjectId: string;
  consentType: string;
  status: string;
  grantedAt?: string;
  revokedAt?: string;
  dataAsset?: { name: string };
}

const SENSITIVITY_COLORS: Record<string, string> = {
  PUBLIC: "bg-green-500/15 text-green-400 border-green-500/30",
  INTERNAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  CONFIDENTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  RESTRICTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  PII: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function DataGovernancePage() {
  const api = useApi();
  const [assets, setAssets] = useState<DataAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ assets: DataAsset[] }>("/data-assets")
      .then((r) => setAssets(r.assets ?? []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

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
      cell: (row) => (
        <Badge variant="outline" className="text-xs">{row.dataType}</Badge>
      ),
    },
    {
      key: "sensitivity",
      header: "Sensitivity",
      cell: (row) => (
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
            SENSITIVITY_COLORS[row.sensitivity] ?? "bg-muted"
          }`}
        >
          {row.sensitivity}
        </span>
      ),
    },
    {
      key: "hasPii",
      header: "PII",
      cell: (row) => (
        <div>
          {row.hasPii ? (
            <div>
              <Badge className="text-xs bg-red-500/15 text-red-400 border-red-500/30">
                <Lock className="h-2.5 w-2.5 mr-1" /> PII
              </Badge>
              {row.piiFields.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {row.piiFields.slice(0, 3).join(", ")}
                  {row.piiFields.length > 3 && "..."}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    {
      key: "retentionDays",
      header: "Retention",
      cell: (row) => (
        <span className="text-sm">
          {row.retentionDays ? `${row.retentionDays}d` : "Indefinite"}
        </span>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.owner ?? "—"}</span>
      ),
    },
  ];

  // Mock data lineage for visualization
  const lineageExamples = [
    {
      source: "Customer CRM",
      model: "GPT-4 Support Bot",
      output: "Chat Responses",
      sensitivity: "CONFIDENTIAL",
    },
    {
      source: "Transaction DB",
      model: "Fraud Detector ML",
      output: "Risk Scores",
      sensitivity: "RESTRICTED",
    },
    {
      source: "User Profiles",
      model: "Recommendation Engine",
      output: "Product Suggestions",
      sensitivity: "PII",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: assets.length },
          { label: "PII Assets", value: assets.filter((a) => a.hasPii).length },
          { label: "Restricted", value: assets.filter((a) => a.sensitivity === "RESTRICTED").length },
          { label: "Avg Retention", value: assets.filter(a => a.retentionDays).length > 0 ? `${Math.round(assets.filter(a => a.retentionDays).reduce((s, a) => s + (a.retentionDays ?? 0), 0) / assets.filter(a => a.retentionDays).length)}d` : "—" },
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
            <Eye className="h-4 w-4" /> Data Lineage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lineageExamples.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 p-3 rounded-lg bg-muted border border-border text-center">
                  <Database className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                  <p className="text-xs font-medium">{l.source}</p>
                  <span
                    className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                      SENSITIVITY_COLORS[l.sensitivity] ?? ""
                    }`}
                  >
                    {l.sensitivity}
                  </span>
                </div>
                <div className="text-muted-foreground text-lg font-bold">→</div>
                <div className="flex-1 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs font-medium text-primary">{l.model}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">AI Model</p>
                </div>
                <div className="text-muted-foreground text-lg font-bold">→</div>
                <div className="flex-1 p-3 rounded-lg bg-muted border border-border text-center">
                  <p className="text-xs font-medium">{l.output}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Output</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Asset Table */}
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
