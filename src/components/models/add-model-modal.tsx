"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateModelPayload, ModelType } from "@/types";

interface AddModelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const MODEL_TYPES: ModelType[] = [
  "LLM", "ML", "AGENT", "COMPUTER_VISION", "NLP", "RECOMMENDATION",
];

export function AddModelModal({ onClose, onSuccess }: AddModelModalProps) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<CreateModelPayload>({
    name: "",
    version: "1.0.0",
    type: "LLM",
    description: "",
    vendor: "",
    framework: "",
    department: "",
    trainingDataset: "",
    accuracyScore: undefined,
    explainability: 50,
    humanOversight: true,
    isPiiProcessing: false,
    isFinancial: false,
    isCritical: false,
  });

  function field(key: keyof CreateModelPayload) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  function checkbox(key: keyof CreateModelPayload) {
    return {
      checked: form[key] as boolean,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.checked })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await api.post("/models", { ...form, explainability: Number(form.explainability) });
      addNotification({ type: "success", title: "Model registered", message: form.name });
      onSuccess();
    } catch {
      // error handled in useApi
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Register AI Model</h2>
            <p className="text-sm text-muted-foreground">Add a new model to the inventory</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Model Name *</Label>
              <Input id="m-name" placeholder="GPT-4 Customer Support" {...field("name")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-version">Version</Label>
              <Input id="m-version" placeholder="1.0.0" {...field("version")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-type">Model Type *</Label>
              <select
                id="m-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as ModelType }))}
              >
                {MODEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-dept">Department</Label>
              <Input id="m-dept" placeholder="Risk Management" {...field("department")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-vendor">Vendor</Label>
              <Input id="m-vendor" placeholder="OpenAI / Azure / Internal" {...field("vendor")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-framework">Framework</Label>
              <Input id="m-framework" placeholder="PyTorch / TensorFlow" {...field("framework")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Description</Label>
            <textarea
              id="m-desc"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Brief description of the model's purpose..."
              value={form.description ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-dataset">Training Dataset</Label>
              <Input id="m-dataset" placeholder="e.g. CIFAR-10, Internal CRM 2024" {...field("trainingDataset")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-accuracy">Accuracy Score (0–100%)</Label>
              <Input
                id="m-accuracy"
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="e.g. 94.5"
                value={form.accuracyScore != null ? Math.round(form.accuracyScore * 100 * 10) / 10 : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setForm((p) => ({ ...p, accuracyScore: isNaN(val) ? undefined : val / 100 }));
                }}
              />
            </div>
          </div>

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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Black box (0)</span>
              <span>Fully explainable (100)</span>
            </div>
          </div>

          {/* Risk flags */}
          <div className="space-y-2">
            <Label>Risk Flags</Label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["isPiiProcessing", "Processes PII"],
                  ["isFinancial", "Financial Model"],
                  ["isCritical", "Critical System"],
                  ["humanOversight", "Human Oversight"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...checkbox(key)} className="accent-primary" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register Model"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
