"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RiskBadge } from "@/components/shared/risk-badge";
import type { AIModel, RiskLevel, RiskScoreBreakdown } from "@/types";

interface AssessModelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AssessModelModal({ onClose, onSuccess }: AssessModelModalProps) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RiskScoreBreakdown | null>(null);

  const [form, setForm] = useState({
    dataSensitivity: "INTERNAL",
    explainability: 50,
    humanOversight: true,
    isPiiProcessing: false,
    isFinancial: false,
    isCritical: false,
    findings: "",
    mitigations: "",
  });

  useEffect(() => {
    api
      .get<{ models: AIModel[] }>("/models?limit=100")
      .then((r) => setModels(r.models));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedModelId) return;

    setLoading(true);
    try {
      const result = await api.post<{ scores: RiskScoreBreakdown }>(
        `/risk/${selectedModelId}`,
        { ...form, explainability: Number(form.explainability) }
      );
      setPreview(result.scores);
      addNotification({ type: "success", title: "Assessment complete" });
      onSuccess();
    } catch {
      // handled in useApi
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Risk Assessment</h2>
            <p className="text-sm text-muted-foreground">Run a risk assessment for an AI model</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Model select */}
          <div className="space-y-1.5">
            <Label>Select Model *</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              required
            >
              <option value="">Choose a model...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
              ))}
            </select>
          </div>

          {/* Data Sensitivity */}
          <div className="space-y-1.5">
            <Label>Data Sensitivity</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.dataSensitivity}
              onChange={(e) => setForm((p) => ({ ...p, dataSensitivity: e.target.value }))}
            >
              {["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Explainability */}
          <div className="space-y-1.5">
            <Label>Explainability Score: {form.explainability}</Label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.explainability}
              onChange={(e) => setForm((p) => ({ ...p, explainability: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["humanOversight", "Human Oversight"],
                ["isPiiProcessing", "PII Processing"],
                ["isFinancial", "Financial Use"],
                ["isCritical", "Critical System"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                  className="accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          {/* Findings */}
          <div className="space-y-1.5">
            <Label>Findings (optional)</Label>
            <textarea
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Key findings from this assessment..."
              value={form.findings}
              onChange={(e) => setForm((p) => ({ ...p, findings: e.target.value }))}
            />
          </div>

          {/* Preview Result */}
          {preview && (
            <div className="p-4 rounded-lg bg-muted border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assessment Result</span>
                <RiskBadge level={preview.riskLevel as RiskLevel} />
              </div>
              <p className="text-3xl font-bold">{preview.overallScore.toFixed(1)}<span className="text-lg text-muted-foreground">/100</span></p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !selectedModelId}>
              {loading ? "Running..." : "Run Assessment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
