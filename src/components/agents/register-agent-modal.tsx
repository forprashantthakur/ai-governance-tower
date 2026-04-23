"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterAgentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ModelOption {
  id: string;
  name: string;
  type: string;
}

const FORM_DEFAULTS = {
  name: "",
  description: "",
  modelId: "",
  systemPrompt: "",
  tools: "",        // comma-separated string — split to array on submit
  version: "1.0.0",
  maxTokens: "",
  temperature: "",
};

export function RegisterAgentModal({ onClose, onSuccess }: RegisterAgentModalProps) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [form, setForm] = useState(FORM_DEFAULTS);

  // Fetch available AI models for the Base Model dropdown
  useEffect(() => {
    api
      .get<{ models: ModelOption[] }>("/models?limit=100")
      .then((data) => setModels(data.models ?? []))
      .catch(() => {
        // Non-critical — dropdown will be empty, user can still type a UUID
      });
  }, []);

  function field(key: keyof typeof FORM_DEFAULTS) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
      ) => setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.modelId) return;

    setLoading(true);
    try {
      await api.post("/agents", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        modelId: form.modelId,
        systemPrompt: form.systemPrompt.trim() || undefined,
        tools: form.tools
          ? form.tools
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        version: form.version.trim() || "1.0.0",
        maxTokens: form.maxTokens ? Number(form.maxTokens) : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
      });
      addNotification({
        type: "success",
        title: "Agent registered",
        message: form.name.trim(),
      });
      onSuccess();
    } catch {
      // error shown automatically by useApi hook
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Register AI Agent</h2>
            <p className="text-sm text-muted-foreground">
              Add a new agent to the governance registry
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name + Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-name">Agent Name *</Label>
              <Input
                id="a-name"
                placeholder="e.g. AML Alert Analyst"
                required
                {...field("name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-version">Version</Label>
              <Input
                id="a-version"
                placeholder="1.0.0"
                {...field("version")}
              />
            </div>
          </div>

          {/* Base Model */}
          <div className="space-y-1.5">
            <Label htmlFor="a-model">Base Model *</Label>
            <select
              id="a-model"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.modelId}
              onChange={(e) => setForm((p) => ({ ...p, modelId: e.target.value }))}
            >
              <option value="">— Select a model —</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="a-desc">Description</Label>
            <textarea
              id="a-desc"
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="What does this agent do?"
              {...field("description")}
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="a-prompt">System Prompt</Label>
            <textarea
              id="a-prompt"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder="You are an AI agent responsible for..."
              {...field("systemPrompt")}
            />
          </div>

          {/* Tools */}
          <div className="space-y-1.5">
            <Label htmlFor="a-tools">Tools</Label>
            <Input
              id="a-tools"
              placeholder="e.g. risk_score, compliance_check, alert_create"
              {...field("tools")}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of tool names this agent is permitted to use
            </p>
          </div>

          {/* Max Tokens + Temperature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-tokens">Max Tokens</Label>
              <Input
                id="a-tokens"
                type="number"
                min={1}
                max={128000}
                placeholder="e.g. 4096"
                {...field("maxTokens")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-temp">Temperature (0–2)</Label>
              <Input
                id="a-temp"
                type="number"
                min={0}
                max={2}
                step={0.1}
                placeholder="e.g. 0.7"
                {...field("temperature")}
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register Agent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
