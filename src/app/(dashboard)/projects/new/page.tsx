"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProjectTemplate } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  BFSI: "border-blue-500/40 text-blue-400",
  GenAI: "border-purple-500/40 text-purple-400",
  Vision: "border-teal-500/40 text-teal-400",
  Custom: "border-slate-500/40 text-slate-400",
};

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [useBlank, setUseBlank] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    targetDate: "",
    budget: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
    fetch("/api/projects/templates", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTemplates(d.data ?? []));
  }, []);

  async function createProject() {
    setSaving(true);
    setError(null);
    try {
      const token = JSON.parse(localStorage.getItem("ai-governance-auth") ?? "{}").state?.token ?? "";
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          templateId: useBlank ? undefined : selectedTemplate?.id,
          startDate: form.startDate || undefined,
          targetDate: form.targetDate || undefined,
          budget: form.budget ? parseFloat(form.budget) : undefined,
        }),
      });
      const data = await res.json();
      if (data.data?.id) {
        router.push(`/projects/${data.data.id}`);
      } else {
        setError(data.error ?? data.message ?? `Server error (${res.status})`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">New AI Project</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 2</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step > s ? "bg-primary text-primary-foreground" :
              step === s ? "bg-primary/20 text-primary border border-primary/50" :
              "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={`text-sm ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
              {s === 1 ? "Choose Template" : "Project Details"}
            </span>
            {s < 2 && <div className="w-12 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Start from a template or blank</h2>

          {/* Blank option */}
          <div
            onClick={() => { setUseBlank(true); setSelectedTemplate(null); }}
            className={`p-4 border rounded-xl cursor-pointer transition-all ${
              useBlank ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Blank Project</div>
                <div className="text-xs text-muted-foreground">Start from scratch with all 6 phases</div>
              </div>
              {useBlank && <Check className="h-5 w-5 text-primary ml-auto" />}
            </div>
          </div>

          {/* Templates grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setUseBlank(false); }}
                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                  selectedTemplate?.id === t.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.Custom}`}>
                        {t.category}
                      </span>
                    </div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      {(t.scaffold?.tasks?.length ?? 0)} tasks · {(t.scaffold?.milestones?.length ?? 0)} milestones
                    </div>
                  </div>
                  {selectedTemplate?.id === t.id && <Check className="h-5 w-5 text-primary shrink-0" />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep(2)}
              disabled={!useBlank && !selectedTemplate}
              className="gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Project Details */}
      {step === 2 && (
        <div className="space-y-5 max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Project details</h2>

          <div className="space-y-2">
            <Label>Project Name *</Label>
            <Input
              placeholder="e.g. Credit Risk Model v3"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Budget (USD) — optional</Label>
            <Input
              type="number"
              placeholder="50000"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            />
          </div>

          {selectedTemplate && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
              Template: <strong>{selectedTemplate.name}</strong> — will auto-create{" "}
              {selectedTemplate.scaffold?.tasks?.length ?? 0} tasks and{" "}
              {selectedTemplate.scaffold?.milestones?.length ?? 0} milestones
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={createProject}
              disabled={!form.name.trim() || saving}
              className="gap-2"
            >
              {saving ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
