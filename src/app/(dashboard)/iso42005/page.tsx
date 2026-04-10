"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSearch, ChevronDown, ChevronUp, Save, Loader2, Plus, Trash2,
  CheckCircle2, AlertCircle, Clock, Info
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EvidenceUpload } from "@/components/shared/evidence-upload";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelOption { id: string; name: string; type: string; status: string; }

interface ImpactData {
  accountability?: string;
  transparency?: string;
  fairness?: string;
  privacy?: string;
  reliability?: string;
  safety?: string;
  explainabilityDoc?: string;
  environmentalImpact?: string;
  failureMisuse?: string;
}

interface ModelFields {
  intendedUses: string[];
  unintendedUses: string[];
  algorithmType?: string;
  algorithmDescription?: string;
  developmentApproach?: string;
  geographicScope: string[];
  deploymentLanguages: string[];
  environmentDescription?: string;
}

interface Party {
  id: string;
  name: string;
  role: string;
  interest?: string;
  consulted: boolean;
  consultedAt?: string;
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IMPACT_DIMS = [
  { key: "accountability",    label: "§5.8.2.2 Accountability",          clause: "5.8.2.2", icon: "🏛️", desc: "Describe responsible persons/roles, decision trails, and escalation procedures." },
  { key: "transparency",      label: "§5.8.2.3 Transparency",            clause: "5.8.2.3", icon: "🪟", desc: "Describe AI disclosures to end users, model card availability, and explanation mechanisms." },
  { key: "fairness",          label: "§5.8.2.4 Fairness & Non-discrimination", clause: "5.8.2.4", icon: "⚖️", desc: "Document bias testing methodology, protected attributes handled, and fairness metrics achieved." },
  { key: "privacy",           label: "§5.8.2.5 Privacy",                 clause: "5.8.2.5", icon: "🔒", desc: "Describe PII processing, data minimisation measures, and DPIA findings." },
  { key: "reliability",       label: "§5.8.2.6 Reliability & Robustness", clause: "5.8.2.6", icon: "🛡️", desc: "Document performance SLAs, identified failure modes, and resilience testing results." },
  { key: "safety",            label: "§5.8.2.7 Safety",                  clause: "5.8.2.7", icon: "🚨", desc: "Document safety risk identification, human oversight mechanisms, and emergency override capability." },
  { key: "explainabilityDoc", label: "§5.8.2.8 Explainability",          clause: "5.8.2.8", icon: "🔍", desc: "Describe explainability method (SHAP, LIME, etc.), explanation audiences, and known limitations." },
  { key: "environmentalImpact", label: "§5.8.2.9 Environmental Impact",  clause: "5.8.2.9", icon: "🌱", desc: "Document compute energy consumption, carbon footprint estimate, and sustainability measures." },
  { key: "failureMisuse",     label: "§5.8.3 Failures & Misuse",         clause: "5.8.3",   icon: "⚠️", desc: "Document known failure modes, misuse scenarios, and incident response procedures." },
] as const;

const PARTY_ROLES = ["USER", "DATA_SUBJECT", "DEPLOYER", "DEVELOPER", "REGULATOR", "SUPPLIER", "OTHER"];

// ─── Section component ────────────────────────────────────────────────────────

function Section({
  title, clause, icon, description, defaultOpen = false, children,
}: {
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

function Textarea({
  value, onChange, placeholder, rows = 4,
}: {
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

function TagInput({
  values, onChange, placeholder,
}: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setInput("");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <Button size="sm" variant="outline" onClick={add} type="button">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 text-xs"
            >
              {v}
              <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-400">
                ×
              </button>
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

  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [impact, setImpact] = useState<ImpactData>({});
  const [modelFields, setModelFields] = useState<ModelFields>({
    intendedUses: [], unintendedUses: [], geographicScope: [], deploymentLanguages: [],
  });
  const [parties, setParties] = useState<Party[]>([]);
  const [newParty, setNewParty] = useState<Partial<Party>>({ role: "USER", consulted: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch models list on mount
  useEffect(() => {
    api.get<{ models: ModelOption[] }>("/models?limit=200").then((r) => setModels(r.models));
  }, []);

  // Fetch assessment data when model changes
  const fetchAssessment = useCallback(async () => {
    if (!selectedModelId) return;
    setLoading(true);
    try {
      const data = await api.get<{
        impact: ImpactData | null;
        model: ModelFields & { id: string; name: string };
        parties: Party[];
      }>(`/iso42005?modelId=${selectedModelId}`);

      setImpact(data.impact ?? {});
      setModelFields({
        intendedUses: data.model.intendedUses ?? [],
        unintendedUses: data.model.unintendedUses ?? [],
        algorithmType: data.model.algorithmType ?? "",
        algorithmDescription: data.model.algorithmDescription ?? "",
        developmentApproach: data.model.developmentApproach ?? "",
        geographicScope: data.model.geographicScope ?? [],
        deploymentLanguages: data.model.deploymentLanguages ?? [],
        environmentDescription: data.model.environmentDescription ?? "",
      });
      setParties(data.parties ?? []);
    } finally {
      setLoading(false);
    }
  }, [selectedModelId]);

  useEffect(() => { fetchAssessment(); }, [fetchAssessment]);

  async function saveAll() {
    if (!selectedModelId) return;
    setSaving(true);
    try {
      await Promise.all([
        api.post("/iso42005", { modelId: selectedModelId, ...impact }),
        api.patch("/iso42005", { modelId: selectedModelId, ...modelFields }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function addParty() {
    if (!newParty.name || !selectedModelId) return;
    const party = await api.post<Party>("/iso42005/parties", {
      ...newParty,
      modelId: selectedModelId,
    });
    setParties((prev) => [...prev, party]);
    setNewParty({ role: "USER", consulted: false });
  }

  async function deleteParty(id: string) {
    await api.del(`/iso42005/parties?id=${id}`);
    setParties((prev) => prev.filter((p) => p.id !== id));
  }

  const completedDims = IMPACT_DIMS.filter((d) => !!(impact as Record<string, string | undefined>)[d.key]).length;
  const totalDims = IMPACT_DIMS.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            ISO 42005 — AI System Impact Assessment
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Document all sub-clauses 5.3–5.9 per AI model with evidence file upload
          </p>
        </div>
        <Button
          onClick={saveAll}
          disabled={!selectedModelId || saving}
          className="shrink-0"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />Saved!</>
          ) : (
            <><Save className="h-4 w-4 mr-2" />Save Assessment</>
          )}
        </Button>
      </div>

      {/* Model selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Select AI Model to Assess
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Choose a model —</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.type})</option>
                ))}
              </select>
            </div>
            {selectedModelId && (
              <div className="flex items-center gap-3 pt-5 sm:pt-0 shrink-0">
                <div className="text-center">
                  <div className="text-xl font-bold text-primary">{completedDims}/{totalDims}</div>
                  <div className="text-[11px] text-muted-foreground">Dimensions</div>
                </div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(completedDims / totalDims) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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

          {/* ─── §5.3 AI System Information ─────────────────────────────────── */}
          <Section title="§5.3 — AI System Information" clause="ISO 42005 §5.3" icon="🤖"
            description="System description, features, purpose, intended and unintended uses"
            defaultOpen>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  §5.3.4 — Intended Uses <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">Authorised use cases, target user populations, and deployment contexts for this AI system.</p>
                <TagInput
                  values={modelFields.intendedUses}
                  onChange={(v) => setModelFields({ ...modelFields, intendedUses: v })}
                  placeholder="e.g. Credit scoring for retail banking customers"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  §5.3.5 — Unintended Uses / Misuse Scenarios <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">Known misuse vectors, abuse scenarios, and explicitly out-of-scope applications.</p>
                <TagInput
                  values={modelFields.unintendedUses}
                  onChange={(v) => setModelFields({ ...modelFields, unintendedUses: v })}
                  placeholder="e.g. Using for hiring decisions (prohibited)"
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.3" label="Evidence — System Documentation" />
            </div>
          </Section>

          {/* ─── §5.5 Algorithm & Model ───────────────────────────────────── */}
          <Section title="§5.5 — Algorithm & Model Information" clause="ISO 42005 §5.5" icon="⚙️"
            description="Algorithm type, development methodology, training data, model lifecycle">
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.5.2 — Algorithm Type</label>
                  <input
                    value={modelFields.algorithmType ?? ""}
                    onChange={(e) => setModelFields({ ...modelFields, algorithmType: e.target.value })}
                    placeholder="e.g. Gradient Boosted Trees, Transformer, CNN"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.5.3 — Development Approach</label>
                  <input
                    value={modelFields.developmentApproach ?? ""}
                    onChange={(e) => setModelFields({ ...modelFields, developmentApproach: e.target.value })}
                    placeholder="e.g. Supervised learning, fine-tuning from GPT-4"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.5.2 — Algorithm Description &amp; Key Design Decisions</label>
                <Textarea
                  value={modelFields.algorithmDescription ?? ""}
                  onChange={(v) => setModelFields({ ...modelFields, algorithmDescription: v })}
                  placeholder="Describe the algorithm architecture, key design choices, bias testing approach, and known limitations…"
                  rows={4}
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.5" label="Evidence — Algorithm & Model Documentation" />
            </div>
          </Section>

          {/* ─── §5.6 Deployment Environment ─────────────────────────────── */}
          <Section title="§5.6 — Deployment Environment" clause="ISO 42005 §5.6" icon="🌐"
            description="Geographic scope, languages, environment complexity, integrations">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.6.1 — Geographic Scope</label>
                <p className="text-[11px] text-muted-foreground mb-2">Countries/regions where this AI system is deployed.</p>
                <TagInput
                  values={modelFields.geographicScope}
                  onChange={(v) => setModelFields({ ...modelFields, geographicScope: v })}
                  placeholder="e.g. India, Singapore, UAE"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.6.1 — Deployment Languages</label>
                <TagInput
                  values={modelFields.deploymentLanguages}
                  onChange={(v) => setModelFields({ ...modelFields, deploymentLanguages: v })}
                  placeholder="e.g. English, Hindi, Tamil"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">§5.6.2 — Environment Description</label>
                <Textarea
                  value={modelFields.environmentDescription ?? ""}
                  onChange={(v) => setModelFields({ ...modelFields, environmentDescription: v })}
                  placeholder="Describe integrations, infrastructure, human-AI interaction model, and dependencies…"
                  rows={3}
                />
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.6" label="Evidence — Deployment Documentation" />
            </div>
          </Section>

          {/* ─── §5.7 Interested Parties ─────────────────────────────────── */}
          <Section title="§5.7 — Interested Parties Register" clause="ISO 42005 §5.7" icon="👥"
            description="Identify and document all parties with interests in this AI system">
            <div className="space-y-4">
              {parties.length > 0 && (
                <div className="space-y-2">
                  {parties.map((p) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{p.name}</span>
                          <Badge variant="outline" className="text-xs">{p.role}</Badge>
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
                        {p.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{p.notes}</p>}
                      </div>
                      <button onClick={() => deleteParty(p.id)} className="text-muted-foreground hover:text-red-400 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add party form */}
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
                    <input
                      type="checkbox"
                      checked={newParty.consulted ?? false}
                      onChange={(e) => setNewParty({ ...newParty, consulted: e.target.checked })}
                      className="rounded"
                    />
                    Consulted
                  </label>
                  {newParty.consulted && (
                    <input
                      type="date"
                      value={newParty.consultedAt ?? ""}
                      onChange={(e) => setNewParty({ ...newParty, consultedAt: e.target.value })}
                      className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                  <Button size="sm" onClick={addParty} disabled={!newParty.name} className="ml-auto">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Party
                  </Button>
                </div>
              </div>

              <EvidenceUpload modelId={selectedModelId} section="5.7" label="Evidence — Consultation Records" />
            </div>
          </Section>

          {/* ─── §5.8 Impact Dimensions (9) ──────────────────────────────── */}
          <Section title="§5.8 — AI System Impacts (9 Dimensions)" clause="ISO 42005 §5.8" icon="⚖️"
            description="Document all 9 impact dimensions required by ISO 42005 §5.8.2">
            <div className="space-y-6">
              {IMPACT_DIMS.map((dim) => {
                const value = (impact as Record<string, string | undefined>)[dim.key] ?? "";
                const filled = value.trim().length > 0;
                return (
                  <div key={dim.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span>{dim.icon}</span>
                      <label className="text-xs font-semibold text-foreground">{dim.label}</label>
                      {filled ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 ml-auto" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-400 ml-auto" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3 w-3 shrink-0 mt-0.5" />{dim.desc}
                    </p>
                    <Textarea
                      value={value}
                      onChange={(v) => setImpact({ ...impact, [dim.key]: v })}
                      placeholder={`Document ${dim.label.split("—")[1]?.trim() ?? dim.label}…`}
                      rows={3}
                    />
                    <EvidenceUpload
                      modelId={selectedModelId}
                      section={dim.clause}
                      label={`Evidence — ${dim.clause}`}
                      compact
                    />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ─── §5.9 Measures ────────────────────────────────────────────── */}
          <Section title="§5.9 — Measures (Compliance Controls)" clause="ISO 42005 §5.9" icon="🛡️"
            description="Link to your compliance controls on the Risk & Compliance page for technical and management measures">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  ISO 42005 §5.9 measures are tracked as <strong className="text-foreground">Compliance Controls</strong> under the <strong className="text-foreground">ISO42005</strong> framework.
                  Visit the <a href="/risk" className="text-primary hover:underline">Risk &amp; Compliance</a> page to manage controls, set status (PASS/FAIL/PARTIAL),
                  add evidence text, and upload evidence documents per control.
                </div>
              </div>
              <EvidenceUpload modelId={selectedModelId} section="5.9" label="Evidence — Measures Documentation" />
            </div>
          </Section>

          {/* Save button at bottom */}
          <div className="flex justify-end pt-2">
            <Button onClick={saveAll} disabled={!selectedModelId || saving} size="lg">
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              ) : saved ? (
                <><CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />Saved!</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Save All Changes</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
