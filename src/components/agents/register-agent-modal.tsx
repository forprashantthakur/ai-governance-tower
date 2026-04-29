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

// ── Top external LLMs grouped by provider ─────────────────────────────────────
const EXTERNAL_LLMS: { provider: string; models: { value: string; label: string }[] }[] = [
  {
    provider: "OpenAI",
    models: [
      { value: "gpt-4o",              label: "GPT-4o" },
      { value: "gpt-4o-mini",         label: "GPT-4o Mini" },
      { value: "gpt-4-turbo",         label: "GPT-4 Turbo" },
      { value: "gpt-4",               label: "GPT-4" },
      { value: "gpt-3.5-turbo",       label: "GPT-3.5 Turbo" },
      { value: "o1",                   label: "o1" },
      { value: "o3-mini",             label: "o3 Mini" },
    ],
  },
  {
    provider: "Anthropic",
    models: [
      { value: "claude-opus-4",                label: "Claude Opus 4" },
      { value: "claude-sonnet-4",              label: "Claude Sonnet 4" },
      { value: "claude-3-7-sonnet",            label: "Claude 3.7 Sonnet" },
      { value: "claude-3-5-sonnet",            label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku",             label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus",                label: "Claude 3 Opus" },
    ],
  },
  {
    provider: "Google",
    models: [
      { value: "gemini-2.0-flash",    label: "Gemini 2.0 Flash" },
      { value: "gemini-2.0-pro",      label: "Gemini 2.0 Pro" },
      { value: "gemini-1.5-pro",      label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash",    label: "Gemini 1.5 Flash" },
    ],
  },
  {
    provider: "Meta",
    models: [
      { value: "llama-3.3-70b",       label: "Llama 3.3 70B" },
      { value: "llama-3.1-405b",      label: "Llama 3.1 405B" },
      { value: "llama-3.1-70b",       label: "Llama 3.1 70B" },
      { value: "llama-3.1-8b",        label: "Llama 3.1 8B" },
    ],
  },
  {
    provider: "Mistral",
    models: [
      { value: "mistral-large",       label: "Mistral Large" },
      { value: "mistral-small",       label: "Mistral Small" },
      { value: "mixtral-8x22b",       label: "Mixtral 8×22B" },
    ],
  },
  {
    provider: "Cohere",
    models: [
      { value: "command-r-plus",      label: "Command R+" },
      { value: "command-r",           label: "Command R" },
    ],
  },
  {
    provider: "xAI",
    models: [
      { value: "grok-3",              label: "Grok 3" },
      { value: "grok-2",              label: "Grok 2" },
    ],
  },
  {
    provider: "Amazon",
    models: [
      { value: "nova-pro",            label: "Amazon Nova Pro" },
      { value: "nova-lite",           label: "Amazon Nova Lite" },
      { value: "titan-text-express",  label: "Titan Text Express" },
    ],
  },
  {
    provider: "Microsoft",
    models: [
      { value: "phi-4",               label: "Phi-4" },
      { value: "phi-3.5-mini",        label: "Phi-3.5 Mini" },
    ],
  },
];

const FORM_DEFAULTS = {
  name: "",
  description: "",
  baseModelValue: "",   // either "reg:<uuid>" or "llm:<name>" or "other"
  systemPrompt: "",
  tools: "",
  version: "1.0.0",
  maxTokens: "",
  temperature: "",
};

export function RegisterAgentModal({ onClose, onSuccess }: RegisterAgentModalProps) {
  const api = useApi();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [registryModels, setRegistryModels] = useState<ModelOption[]>([]);
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [customModel, setCustomModel] = useState("");  // for "Others" free-text

  useEffect(() => {
    api
      .get<{ models: ModelOption[] }>("/models?limit=100")
      .then((data) => setRegistryModels(data.models ?? []))
      .catch(() => {});
  }, []);

  function field(key: keyof typeof FORM_DEFAULTS) {
    return {
      value: form[key],
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      ) => setForm((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  // Derive what to send to the API from the selected baseModelValue
  function resolveModel() {
    const v = form.baseModelValue;
    if (!v) return { modelId: undefined, externalModel: undefined };
    if (v === "other") return { modelId: undefined, externalModel: customModel.trim() || "Other" };
    if (v.startsWith("reg:")) return { modelId: v.slice(4), externalModel: undefined };
    if (v.startsWith("llm:")) return { modelId: undefined, externalModel: v.slice(4) };
    return { modelId: undefined, externalModel: undefined };
  }

  const isValid = form.name.trim() &&
    form.baseModelValue &&
    (form.baseModelValue !== "other" || customModel.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    const { modelId, externalModel } = resolveModel();
    setLoading(true);
    try {
      await api.post("/agents", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        modelId,
        externalModel,
        systemPrompt: form.systemPrompt.trim() || undefined,
        tools: form.tools
          ? form.tools.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        version: form.version.trim() || "1.0.0",
        maxTokens: form.maxTokens ? Number(form.maxTokens) : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
      });
      addNotification({ type: "success", title: "Agent registered", message: form.name.trim() });
      onSuccess();
    } catch {
      // error shown by useApi hook
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
            <p className="text-sm text-muted-foreground">Add a new agent to the governance registry</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name + Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-name">Agent Name *</Label>
              <Input id="a-name" placeholder="e.g. AML Alert Analyst" required {...field("name")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-version">Version</Label>
              <Input id="a-version" placeholder="1.0.0" {...field("version")} />
            </div>
          </div>

          {/* Base Model */}
          <div className="space-y-1.5">
            <Label htmlFor="a-model">Base Model *</Label>
            <select
              id="a-model"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.baseModelValue}
              onChange={(e) => setForm((p) => ({ ...p, baseModelValue: e.target.value }))}
            >
              <option value="">— Select base model —</option>

              {/* External LLMs grouped by provider */}
              {EXTERNAL_LLMS.map((grp) => (
                <optgroup key={grp.provider} label={`── ${grp.provider} ──`}>
                  {grp.models.map((m) => (
                    <option key={m.value} value={`llm:${m.value}`}>{m.label}</option>
                  ))}
                </optgroup>
              ))}

              {/* Internal AI Inventory models */}
              {registryModels.length > 0 && (
                <optgroup label="── From AI Inventory ──">
                  {registryModels.map((m) => (
                    <option key={m.id} value={`reg:${m.id}`}>
                      {m.name} ({m.type})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Others */}
              <optgroup label="──────────────">
                <option value="other">Others (specify below)</option>
              </optgroup>
            </select>

            {/* Free-text input when Others is selected */}
            {form.baseModelValue === "other" && (
              <Input
                placeholder="e.g. Falcon 180B, Qwen2.5, DeepSeek-R1…"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="mt-2"
              />
            )}
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

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !isValid}>
              {loading ? "Registering..." : "Register Agent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
