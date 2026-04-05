"use client";

import { useState } from "react";
import { Settings, Users, Key, Shield, Bell, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";

const ROLES = [
  {
    role: "ADMIN",
    description: "Full system access. Manage users, models, and configuration.",
    permissions: ["All permissions"],
    color: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  {
    role: "RISK_OFFICER",
    description: "Create/edit models, run risk assessments, manage compliance controls.",
    permissions: ["Create/Edit models", "Risk assessments", "Compliance management"],
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  {
    role: "AUDITOR",
    description: "Read-only access to all data. Export reports and audit logs.",
    permissions: ["Read all data", "Export reports", "View audit logs"],
    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  {
    role: "VIEWER",
    description: "Basic read access to dashboard and model inventory.",
    permissions: ["View dashboard", "View models"],
    color: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
];

const DPDP_CONTROLS = [
  { id: "DPDP-7.1", name: "Data Principal Notice", required: true },
  { id: "DPDP-7.2", name: "Consent Management", required: true },
  { id: "DPDP-8.1", name: "Data Accuracy", required: true },
  { id: "DPDP-9.1", name: "Data Minimisation", required: true },
  { id: "DPDP-10.1", name: "Storage Limitation", required: true },
  { id: "DPDP-11.1", name: "Cross-border Transfer Controls", required: false },
  { id: "DPDP-12.1", name: "Grievance Redressal Mechanism", required: true },
];

const ISO42001_CONTROLS = [
  { id: "ISO42001-4.1", name: "AI Policy", required: true },
  { id: "ISO42001-5.1", name: "Leadership Commitment", required: true },
  { id: "ISO42001-6.1", name: "AI Risk Management", required: true },
  { id: "ISO42001-8.1", name: "AI System Lifecycle", required: true },
  { id: "ISO42001-9.1", name: "Performance Evaluation", required: false },
  { id: "ISO42001-10.1", name: "Continual Improvement", required: false },
];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const [activeTab, setActiveTab] = useState<"rbac" | "api" | "policy" | "alerts">("rbac");
  const [apiKeyName, setApiKeyName] = useState("");

  const tabs = [
    { id: "rbac" as const, label: "RBAC", icon: Users },
    { id: "api" as const, label: "API Keys", icon: Key },
    { id: "policy" as const, label: "Policy Config", icon: Shield },
    { id: "alerts" as const, label: "Alert Rules", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* RBAC Tab */}
      {activeTab === "rbac" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role-Based Access Control</CardTitle>
              <CardDescription>
                Define what each role can do within the AI Governance platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {ROLES.map((r) => (
                <div key={r.role} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${r.color}`}
                    >
                      {r.role}
                    </span>
                    {user?.role === r.role && (
                      <Badge variant="secondary" className="text-xs">Your Role</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.map((p) => (
                      <span key={p} className="text-xs bg-muted rounded px-2 py-0.5">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Key Management</CardTitle>
            <CardDescription>
              Manage programmatic access tokens for integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Key name (e.g. CI/CD Pipeline)"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={() => {
                  if (!apiKeyName) return;
                  addNotification({
                    type: "info",
                    title: "API Key Generation",
                    message: "Connect to backend to generate real API keys.",
                  });
                  setApiKeyName("");
                }}
              >
                <Key className="h-4 w-4" />
                Generate Key
              </Button>
            </div>
            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground text-center">
              No API keys yet. Generate one to get started.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Config Tab */}
      {activeTab === "policy" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">DPDP Controls ({DPDP_CONTROLS.length})</CardTitle>
              <CardDescription>India Data Protection & Digital Privacy controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DPDP_CONTROLS.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                      <span className="ml-3 text-sm">{c.name}</span>
                    </div>
                    {c.required && <Badge variant="danger" className="text-xs">Required</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ISO 42001 Controls ({ISO42001_CONTROLS.length})</CardTitle>
              <CardDescription>AI Management System controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ISO42001_CONTROLS.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                      <span className="ml-3 text-sm">{c.name}</span>
                    </div>
                    {c.required && <Badge variant="danger" className="text-xs">Required</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert Rules Tab */}
      {activeTab === "alerts" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alert Configuration</CardTitle>
            <CardDescription>Configure thresholds that trigger governance alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Toxicity Score Threshold", key: "toxicity_threshold", default: "0.7", unit: "" },
              { label: "Bias Score Threshold", key: "bias_threshold", default: "0.5", unit: "" },
              { label: "Latency Alert (ms)", key: "latency_alert_ms", default: "5000", unit: "ms" },
              { label: "Flagged Rate Alert (%)", key: "flag_rate_alert", default: "5", unit: "%" },
              { label: "Risk Score Alert", key: "risk_score_alert", default: "75", unit: "/100" },
            ].map((rule) => (
              <div key={rule.key} className="flex items-center gap-4">
                <Label className="w-52 shrink-0">{rule.label}</Label>
                <Input
                  type="number"
                  defaultValue={rule.default}
                  className="w-32"
                />
                {rule.unit && <span className="text-sm text-muted-foreground">{rule.unit}</span>}
              </div>
            ))}
            <Button className="mt-2" onClick={() => addNotification({ type: "success", title: "Alert rules saved" })}>
              <Save className="h-4 w-4" />
              Save Rules
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
