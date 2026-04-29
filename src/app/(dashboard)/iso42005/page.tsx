"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSearch, ChevronDown, ChevronUp, Save, Loader2, Plus, Trash2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CheckCircle2, AlertCircle, Clock, Info, AlertOctagon
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidenceUpload } from "@/components/shared/evidence-upload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; status: string; }
interface ModelOption { id: string; name: string; type: string; status: string; }

// Combined selection value: "project:<id>" or "model:<id>"
type SelectionValue = "" | `project:${string}` | `model:${string}`;

interface AssessmentData {
  // Sec. 5.3
  intendedUses: string[];
  unintendedUses: string[];
  // Sec. 5.5
  algorithmType: string;
  algorithmDescription: string;
  developmentApproach: string;
  // Sec. 5.6
  geographicScope: string[];
  deploymentLanguages: string[];
  environmentDescription: string;
  // Sec. 5.8
  accountability: string;
  transparency: string;
  fairness: string;
  privacy: string;
  reliability: string;
  safety: string;
  explainabilityDoc: string;
  environmentalImpact: string;
  failureMisuse: string;
}

const EMPTY: AssessmentData = {
  intendedUses: [], unintendedUses: [],
  algorithmType: "", algorithmDescription: "", developmentApproach: "",
  geographicScope: [], deploymentLanguages: [], environmentDescription: "",
  accountability: "", transparency: "", fairness: "", privacy: "",
  reliability: "", safety: "", explainabilityDoc: "", environmentalImpact: "", failureMisuse: "",
};

interface Party {
  id: string; name: string; role: string;
  interest?: string; consulted: boolean; consultedAt?: string; notes?: string;
}

interface MisuseScenario {
  id: string;
  modelId: string;
  title: string;
  description: string;
  likelihood: number; // 1-5
  severity: number;   // 1-5
  harmCategory: string;
  affectedGroups: string[];
  mitigations?: string;
  isAddressed: boolean;
}

const HARM_CATEGORIES = [
  { value: "DISCRIMINATION", label: "Discrimination" },
  { value: "PRIVACY_VIOLATION", label: "Privacy Violation" },
  { value: "FINANCIAL_HARM", label: "Financial Harm" },
  { value: "PHYSICAL_HARM", label: "Physical Harm" },
  { value: "REPUTATIONAL_HARM", label: "Reputational Harm" },
  { value: "AUTONOMY_VIOLATION", label: "Autonomy Violation" },
  { value: "SOCIETAL_HARM", label: "Societal Harm" },
  { value: "SECURITY_HARM", label: "Security Harm" },
  { value: "OTHER", label: "Other" },
] as const;

const RISK_SCORE_COLOR = (score: number) =>
  score >= 20 ? "text-red-400" : score >= 12 ? "text-orange-400" : score >= 6 ? "text-amber-400" : "text-green-400";

const IMPACT_DIMS = [
  { key: "accountability",    label: "Clause 5.8.2.2 — Accountability",              num: 1, clause: "5.8.2.2", icon: "🏛️", desc: "Describe responsible persons/roles, decision trails, and escalation procedures." },
  { key: "transparency",      label: "Clause 5.8.2.3 — Transparency",                num: 2, clause: "5.8.2.3", icon: "🪟", desc: "Describe AI disclosures to end users, model card availability, and explanation mechanisms." },
  { key: "fairness",          label: "Clause 5.8.2.4 — Fairness & Non-discrimination", num: 3, clause: "5.8.2.4", icon: "⚖️", desc: "Document bias testing methodology, protected attributes handled, and fairness metrics achieved." },
  { key: "privacy",           label: "Clause 5.8.2.5 — Privacy",                     num: 4, clause: "5.8.2.5", icon: "🔒", desc: "Describe PII processing, data minimisation measures, and DPIA findings." },
  { key: "reliability",       label: "Clause 5.8.2.6 — Reliability & Robustness",    num: 5, clause: "5.8.2.6", icon: "🛡️", desc: "Document performance SLAs, identified failure modes, and resilience testing results." },
  { key: "safety",            label: "Clause 5.8.2.7 — Safety",                      num: 6, clause: "5.8.2.7", icon: "🚨", desc: "Document safety risk identification, human oversight mechanisms, and emergency override capability." },
  { key: "explainabilityDoc", label: "Clause 5.8.2.8 — Explainability",              num: 7, clause: "5.8.2.8", icon: "🔍", desc: "Describe explainability method (SHAP, LIME, etc.), explanation audiences, and known limitations." },
  { key: "environmentalImpact", label: "Clause 5.8.2.9 — Environmental Impact",      num: 8, clause: "5.8.2.9", icon: "🌱", desc: "Document compute energy consumption, carbon footprint estimate, and sustainability measures." },
  { key: "failureMisuse",     label: "Clause 5.8.3 — Failures & Misuse",             num: 9, clause: "5.8.3",   icon: "⚠️", desc: "Document known failure modes, misuse scenarios, and incident response procedures." },
] as const;

const PARTY_ROLES = ["USER", "DATA_SUBJECT", "DEPLOYER", "DEVELOPER", "REGULATOR", "SUPPLIER", "OTHER"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, clause, icon, description, defaultOpen = false, children }: {
  title: string; clause: string; icon: string; description: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between gap-3 py-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="font-mono text-xs text-primary border-primary/30">{clause}</Badge>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
    />
  );
}

function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter to add"}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <Button size="sm" variant="outline" onClick={add} type="button"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 text-xs">
              {v}
              <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-400 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Iso42005Page() {
  const api = useApi();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allInventoryModels, setAllInventoryModels] = useState<ModelOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectionValue>("");
  const [projectModels, setProjectModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [data, setData] = useState<AssessmentData>(EMPTY);
  const [parties, setParties] = useState<Party[]>([]);
  const [newParty, setNewParty] = useState<Partial<Party>>({ role: "USER", consulted: false });
  const [misuseScenarios, setMisuseScenarios] = useState<MisuseScenario[]>([]);
  const [newMisuse, setNewMisuse] = useState<Partial<MisuseScenario>>({
    likelihood: 3, severity: 3, harmCategory: "OTHER", affectedGroups: [],
  });
  const [addingMisuse, setAddingMisuse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Fetch projects AND all AI inventory models on mount (parallel)
  useEffect(() => {
    api.get<{ items: ProjectOption[] }>("/projects?limit=200")
      .then((r) => { setProjects(r.items ?? []); })
      .catch(() => { setLoadError(true); });
    api.get<{ models: ModelOption[] }>("/models?limit=200")
      .then((r) => { setAllInventoryModels(r.models ?? []); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to combined selection change
  useEffect(() => {
    if (!selectedItem) {
      setProjectModels([]);
      setSelectedModelId("");
      return;
    }
    if (selectedItem.startsWith("model:")) {
      // Direct model selection — use it immediately
      const modelId = selectedItem.slice("model:".length);
      setProjectModels([]);
      setSelectedModelId(modelId);
    } else if (selectedItem.startsWith("project:")) {
      // Project selection — load models linked to this project
      const projectId = selectedItem.slice("project:".length);
      setSelectedModelId("");
      setModelsLoading(true);
      api.get<{ model: ModelOption }[]>(`/projects/${projectId}/models`)
        .then((links) => { setProjectModels(links.map((l) => l.model)); })
        .catch(() => { setProjectModels([]); })
        .finally(() => { setModelsLoading(false); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem]);

  // Fetch existing assessment when model changes
  const fetchAssessment = useCallback(async () => {
    if (!selectedModelId) return;
    setLoading(true);
    try {
      const res = await api.get<{
        impact: Partial<AssessmentData> | null;
        parties: Party[];
      }>(`/iso42005?modelId=${selectedModelId}`);

      const ia = res.impact;
      setData({
        intendedUses:          ia?.intendedUses          ?? [],
        unintendedUses:        ia?.unintendedUses        ?? [],
        algorithmType:         ia?.algorithmType         ?? "",
        algorithmDescription:  ia?.algorithmDescription  ?? "",
        developmentApproach:   ia?.developmentApproach   ?? "",
        geographicScope:       ia?.geographicScope       ?? [],
        deploymentLanguages:   ia?.deploymentLanguages   ?? [],
        environmentDescription: ia?.environmentDescription ?? "",
        accountability:        ia?.accountability        ?? "",
        transparency:          ia?.transparency          ?? "",
        fairness:              ia?.fairness              ?? "",
        privacy:               ia?.privacy               ?? "",
        reliability:           ia?.reliability           ?? "",
        safety:                ia?.safety                ?? "",
        explainabilityDoc:     ia?.explainabilityDoc     ?? "",
        environmentalImpact:   ia?.environmentalImpact   ?? "",
        failureMisuse:         ia?.failureMisuse         ?? "",
      });
      setParties(res.parties ?? []);
      // Also fetch misuse scenarios
      api.get<MisuseScenario[]>(`/misuse-scenarios?modelId=${selectedModelId}`)
        .then(setMisuseScenarios)
        .catch(() => {});
    } catch {
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  useEffect(() => { fetchAssessment(); }, [fetchAssessment]);

  function set(field: keyof AssessmentData, value: string | string[]) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function saveAll() {
    if (!selectedModelId) return;
    setSaving(true);
    try {
      await api.post("/iso42005", { modelId: selectedModelId, ...data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // error shown by useApi toast
    } finally {
      setSaving(false);
    }
  }

  async function addParty() {
    if (!newParty.name || !selectedModelId) return;
    try {
      const party = await api.post<Party>("/iso42005/parties", { ...newParty, modelId: selectedModelId });
      setParties((prev) => [...prev, party]);
      setNewParty({ role: "USER", consulted: false });
    } catch { /* toast shown */ }
  }

  async function removeParty(id: string) {
    await api.del(`/iso42005/parties?id=${id}`);
    setParties((prev) => prev.filter((p) => p.id !== id));
  }

  async function addMisuseScenario() {
    if (!newMisuse.title || !newMisuse.description || !selectedModelId) return;
    setAddingMisuse(true);
    try {
      const scenario = await api.post<MisuseScenario>("/misuse-scenarios", {
        ...newMisuse, modelId: selectedModelId,
        affectedGroups: newMisuse.affectedGroups ?? [],
      });
      setMisuseScenarios((prev) => [...prev, scenario]);
      setNewMisuse({ likelihood: 3, severity: 3, harmCategory: "OTHER", affectedGroups: [] });
    } catch { /* toast */ } finally { setAddingMisuse(false); }
  }

  async function toggleMisuseAddressed(id: string, current: boolean) {
    await api.patch(`/misuse-scenarios/${id}`, { isAddressed: !current });
    setMisuseScenarios((prev) => prev.map((s) => s.id === id ? { ...s, isAddressed: !current } : s));
  }

  async function removeMisuseScenario(id: string) {
    await api.del(`/misuse-scenarios/${id}`);
    setMisuseScenarios((prev) => prev.filter((s) => s.id !== id));
  }

  const filledDims = IMPACT_DIMS.filter((d) => (data[d.key as keyof AssessmentData] as string).trim().length > 0).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            ISO 42005 — AI System Impact Assessment
          </h1>
        </div>
        <Button onClick={saveAll} disabled={!selectedModelId || saving} className="shrink-0">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            : saved ? <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />Saved!</>
            : <><Save className="h-4 w-4 mr-2" />Save Assessment</>}
        </Button>
      </div>

      {/* Combined selector */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Combined dropdown — AI Projects + AI Models */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Select AI Project or AI Model
            </label>
            {loadError ? (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                Failed to load data. Please refresh the page.
              </p>
            ) : (
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value as SelectionValue)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Choose a project or model to assess —</option>
                {projects.length > 0 && (
                  <optgroup label="── AI Projects ──">
                    {projects.map((p) => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.name}{p.status ? ` (${p.status.replace(/_/g, " ")})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {allInventoryModels.length > 0 && (
                  <optgroup label="── AI Models (Inventory) ──">
                    {allInventoryModels.map((m) => (
                      <option key={m.id} value={`model:${m.id}`}>
                        {m.name} — {m.type}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Select a project to pick a linked model, or select a model directly from AI Inventory.
            </p>
          </div>

          {/* Step 2 — Model within selected project */}
          {selectedItem.startsWith("project:") && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Select Model within Project
              </label>
              {modelsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading linked models…
                </div>
              ) : projectModels.length === 0 ? (
                <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded px-3 py-2">
                  No AI models linked to this project yet. Link models in the AI Projects module first.
                </p>
              ) : (
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— Choose a model —</option>
                  {projectModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Progress indicator */}
          {selectedModelId && (
            <div className="flex items-center gap-3 pt-1 border-t border-border/50">
              <div className="text-center shrink-0">
                <div className="text-xl font-bold text-primary">{filledDims}/{IMPACT_DIMS.length}</div>
                <div className="text-[11px] text-muted-foreground">Impact Dims</div>
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(filledDims / IMPACT_DIMS.length) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {Math.round((filledDims / IMPACT_DIMS.length) * 100)}% complete
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedModelId ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <FileSearch className="h-12 w-12 opacity-30" />
          <p className="text-sm">Select an AI model above to begin the ISO 42005 assessment</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading assessment…</span>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Clause 5.3 — AI System Information */}
          <Section title="Clause 5.3 — AI System Information" clause="ISO 42005 · 5.3" icon="🤖"
            description="System purpose, intended uses, and unintended uses / misuse scenarios"
            defaultOpen>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Clause 5.3.4 — Intended Uses <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">Authorised use cases, target user populations, and deployment contexts.</p>
                <TagInput
                  values={data.intendedUses}
                  onChange={(v) => set("intendedUses", v)}
                  placeholder="e.g. Credit scoring for retail banking customers"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Clause 5.3.5 — Unintended Uses / Misuse Scenarios <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">Known misuse vectors and explicitly out-of-scope applications.</p>
                <TagInput
                  values={data.unintendedUses}
                  onChange={(v) => set("unintendedUses", v)}
                  placeholder="e.g. Using for hiring decisions (prohibited)"
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.3" label="Evidence — System Documentation" />
            </div>
          </Section>

          {/* Clause 5.5 — Algorithm & Model */}
          <Section title="Clause 5.5 — Algorithm & Model Information" clause="ISO 42005 · 5.5" icon="⚙️"
            description="Algorithm type, development methodology, training data, model lifecycle">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.5.2 — Algorithm Type</label>
                  <input
                    value={data.algorithmType}
                    onChange={(e) => set("algorithmType", e.target.value)}
                    placeholder="e.g. Gradient Boosted Trees, Transformer"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.5.3 — Development Approach</label>
                  <input
                    value={data.developmentApproach}
                    onChange={(e) => set("developmentApproach", e.target.value)}
                    placeholder="e.g. Supervised learning, fine-tuning from base model"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.5.2 — Algorithm Description &amp; Key Design Decisions</label>
                <Textarea
                  value={data.algorithmDescription}
                  onChange={(v) => set("algorithmDescription", v)}
                  placeholder="Describe the algorithm architecture, key design choices, bias testing approach, and known limitations…"
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.5" label="Evidence — Algorithm & Model Docs" />
            </div>
          </Section>

          {/* Clause 5.6 — Deployment Environment */}
          <Section title="Clause 5.6 — Deployment Environment" clause="ISO 42005 · 5.6" icon="🌐"
            description="Geographic scope, languages, environment complexity, integrations">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.6.1 — Geographic Scope</label>
                <TagInput values={data.geographicScope} onChange={(v) => set("geographicScope", v)} placeholder="e.g. India, Singapore, UAE" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.6.1 — Deployment Languages</label>
                <TagInput values={data.deploymentLanguages} onChange={(v) => set("deploymentLanguages", v)} placeholder="e.g. English, Hindi, Tamil" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clause 5.6.2 — Environment Description</label>
                <Textarea
                  value={data.environmentDescription}
                  onChange={(v) => set("environmentDescription", v)}
                  placeholder="Describe integrations, infrastructure, human-AI interaction model, and dependencies…"
                  rows={3}
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.6" label="Evidence — Deployment Docs" />
            </div>
          </Section>

          {/* Clause 5.7 — Interested Parties */}
          <Section title="Clause 5.7 — Interested Parties Register" clause="ISO 42005 · 5.7" icon="👥"
            description="Identify and document all parties with interests in this AI system">
            <div className="space-y-4">
              {parties.length > 0 && (
                <div className="space-y-2">
                  {parties.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.role.replace("_", " ")}</Badge>
                          {p.consulted ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle2 className="h-3 w-3" /> Consulted
                              {p.consultedAt && ` — ${new Date(p.consultedAt).toLocaleDateString("en-IN")}`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                              <Clock className="h-3 w-3" /> Pending consultation
                            </span>
                          )}
                        </div>
                        {p.interest && <p className="text-xs text-muted-foreground mt-1">{p.interest}</p>}
                      </div>
                      <button onClick={() => removeParty(p.id)} className="text-muted-foreground hover:text-red-400 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Add Interested Party</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={newParty.name ?? ""}
                    onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                    placeholder="Name or organisation"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                  <select
                    value={newParty.role ?? "USER"}
                    onChange={(e) => setNewParty({ ...newParty, role: e.target.value })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PARTY_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                  </select>
                </div>
                <input
                  value={newParty.interest ?? ""}
                  onChange={(e) => setNewParty({ ...newParty, interest: e.target.value })}
                  placeholder="Their interest / concern regarding this AI system"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newParty.consulted ?? false}
                      onChange={(e) => setNewParty({ ...newParty, consulted: e.target.checked })} className="rounded" />
                    Consulted
                  </label>
                  {newParty.consulted && (
                    <input type="date" value={newParty.consultedAt ?? ""}
                      onChange={(e) => setNewParty({ ...newParty, consultedAt: e.target.value })}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  )}
                  <Button size="sm" onClick={addParty} disabled={!newParty.name} className="ml-auto">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Party
                  </Button>
                </div>
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.7" label="Evidence — Consultation Records" />
            </div>
          </Section>

          {/* Clause 5.3.5 Extension — Foreseeable Misuse Scenario Registry */}
          <Section title="Foreseeable Misuse Scenarios — Risk Matrix" clause="ISO 42005 · 5.3.5" icon="⚠️"
            description="Structured modeling of foreseeable misuse, adversarial use, and harm scenarios with severity × likelihood scoring">
            <div className="space-y-4">
              {/* Scenario list */}
              {misuseScenarios.length > 0 && (
                <div className="space-y-2">
                  {misuseScenarios.map((s) => {
                    const riskScore = s.severity * s.likelihood;
                    return (
                      <div key={s.id} className={`p-3 rounded-lg border ${s.isAddressed ? "border-green-500/30 bg-green-500/5 opacity-70" : "border-border bg-muted/10"}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold">{s.title}</span>
                              <Badge variant="outline" className="text-xs">{s.harmCategory.replace(/_/g, " ")}</Badge>
                              <span className={`text-xs font-bold ${RISK_SCORE_COLOR(riskScore)}`}>
                                Risk: {riskScore}/25
                              </span>
                              {s.isAddressed && <span className="text-xs text-green-400">✓ Addressed</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                            <div className="flex items-center gap-4 mt-1.5 text-[11px] text-muted-foreground">
                              <span>Severity: <strong className="text-foreground">{s.severity}/5</strong></span>
                              <span>Likelihood: <strong className="text-foreground">{s.likelihood}/5</strong></span>
                              {s.affectedGroups.length > 0 && <span>Affects: {s.affectedGroups.join(", ")}</span>}
                            </div>
                            {s.mitigations && <p className="text-xs text-muted-foreground mt-1">🛡️ {s.mitigations}</p>}
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => toggleMisuseAddressed(s.id, s.isAddressed)}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${s.isAddressed ? "border-border text-muted-foreground hover:text-foreground" : "border-green-500/50 text-green-400 hover:bg-green-500/10"}`}>
                              {s.isAddressed ? "Reopen" : "Mark Addressed"}
                            </button>
                            <button onClick={() => removeMisuseScenario(s.id)} className="text-muted-foreground hover:text-red-400 p-1">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add new scenario form */}
              <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Add Misuse Scenario</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newMisuse.title ?? ""} onChange={(e) => setNewMisuse({ ...newMisuse, title: e.target.value })}
                    placeholder="Scenario title (e.g. Discriminatory hiring use)"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                  <select value={newMisuse.harmCategory ?? "OTHER"} onChange={(e) => setNewMisuse({ ...newMisuse, harmCategory: e.target.value })}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    {HARM_CATEGORIES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>
                <textarea value={newMisuse.description ?? ""} onChange={(e) => setNewMisuse({ ...newMisuse, description: e.target.value })}
                  placeholder="Describe the misuse scenario, how it could occur, and potential impact…"
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Severity (1-5)</label>
                    <input type="number" min={1} max={5} value={newMisuse.severity ?? 3}
                      onChange={(e) => setNewMisuse({ ...newMisuse, severity: Number(e.target.value) })}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Likelihood (1-5)</label>
                    <input type="number" min={1} max={5} value={newMisuse.likelihood ?? 3}
                      onChange={(e) => setNewMisuse({ ...newMisuse, likelihood: Number(e.target.value) })}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground block mb-1">Affected Groups (comma-separated)</label>
                    <input value={(newMisuse.affectedGroups ?? []).join(", ")}
                      onChange={(e) => setNewMisuse({ ...newMisuse, affectedGroups: e.target.value.split(",").map((g) => g.trim()).filter(Boolean) })}
                      placeholder="e.g. Women, Minorities, Elderly"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                  </div>
                </div>
                <textarea value={newMisuse.mitigations ?? ""} onChange={(e) => setNewMisuse({ ...newMisuse, mitigations: e.target.value })}
                  placeholder="Proposed mitigations or controls to address this scenario…"
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                <Button size="sm" onClick={addMisuseScenario} disabled={!newMisuse.title || !newMisuse.description || addingMisuse}>
                  {addingMisuse ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                  Add Scenario
                </Button>
              </div>
            </div>
          </Section>

          {/* Clause 5.8 — Impact Dimensions */}
          <Section title="Clause 5.8 — AI System Impacts (9 Dimensions)" clause="ISO 42005 · 5.8" icon="⚖️"
            description="Document all 9 impact dimensions required by ISO 42005 Clause 5.8.2">
            <div className="space-y-6">
              {IMPACT_DIMS.map((dim) => {
                const value = (data[dim.key as keyof AssessmentData] as string) ?? "";
                const filled = value.trim().length > 0;
                return (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">{dim.num}</span>
                      <span>{dim.icon}</span>
                      <label className="text-xs font-semibold text-foreground">{dim.label}</label>
                      {filled
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 ml-auto" />
                        : <AlertCircle className="h-3.5 w-3.5 text-amber-400 ml-auto" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3 w-3 shrink-0 mt-0.5" />{dim.desc}
                    </p>
                    <Textarea
                      value={value}
                      onChange={(v) => set(dim.key as keyof AssessmentData, v)}
                      placeholder={`Document ${dim.label.split("—")[1]?.trim() ?? dim.label}…`}
                      rows={3}
                    />
                    <EvidenceUpload modelId={selectedModelId} section={dim.clause} compact />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Clause 5.9 — Measures */}
          <Section title="Clause 5.9 — Measures (Compliance Controls)" clause="ISO 42005 · 5.9" icon="🛡️"
            description="Technical and management measures — tracked as Compliance Controls">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  ISO 42005 Clause 5.9 measures are tracked as <strong className="text-foreground">Compliance Controls</strong> under the <strong className="text-foreground">ISO42005</strong> framework.
                  Visit the <a href="/risk" className="text-primary hover:underline">Risk &amp; Compliance</a> page to manage controls, set their status, and upload evidence per control.
                </p>
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.9" label="Evidence — Measures Documentation" />
            </div>
          </Section>

          <div className="flex justify-end pt-2">
            <Button onClick={saveAll} disabled={!selectedModelId || saving} size="lg">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                : saved ? <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />Saved!</>
                : <><Save className="h-4 w-4 mr-2" />Save All Changes</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
