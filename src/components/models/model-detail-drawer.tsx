"use client";

import { X, ExternalLink, Cpu, Shield } from "lucide-react";
import { RiskBadge, StatusBadge, ComplianceBadge } from "@/components/shared/risk-badge";
import { Badge } from "@/components/ui/badge";
import type { AIModel, RiskLevel, ComplianceStatus } from "@/types";
import { formatDate } from "@/lib/utils";

interface ModelDetailDrawerProps {
  model: AIModel;
  onClose: () => void;
  onRefresh: () => void;
}

export function ModelDetailDrawer({ model, onClose }: ModelDetailDrawerProps) {
  const latest = model.riskAssessments?.[0];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-lg font-semibold">{model.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{model.type}</Badge>
              <StatusBadge status={model.status} />
              {latest && <RiskBadge level={latest.riskLevel as RiskLevel} />}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <Section title="Model Information">
            <InfoRow label="Version" value={model.version} />
            <InfoRow label="Owner" value={model.owner?.name ?? "—"} />
            <InfoRow label="Department" value={model.department ?? "—"} />
            <InfoRow label="Vendor" value={model.vendor ?? "—"} />
            <InfoRow label="Framework" value={model.framework ?? "—"} />
            {model.endpoint && (
              <InfoRow
                label="Endpoint"
                value={
                  <a href={model.endpoint} className="flex items-center gap-1 text-primary hover:underline text-sm" target="_blank" rel="noopener noreferrer">
                    {model.endpoint.slice(0, 40)}... <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {model.description && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">{model.description}</p>
              </div>
            )}
          </Section>

          {/* Risk Profile */}
          <Section title="Risk Profile" icon={Shield}>
            {latest ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{latest.overallScore.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm">/100</span>
                    <RiskBadge level={latest.riskLevel as RiskLevel} />
                  </div>
                </div>
                <ScoreBar label="Data Sensitivity" value={latest.dataSensitivityScore} />
                <ScoreBar label="Model Complexity" value={latest.modelComplexityScore} />
                <ScoreBar label="Explainability Risk" value={latest.explainabilityScore} />
                <ScoreBar label="Human Oversight Risk" value={latest.humanOversightScore} />
                <ScoreBar label="Regulatory Exposure" value={latest.regulatoryExposureScore} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No risk assessment performed yet.</p>
            )}
          </Section>

          {/* Flags */}
          <Section title="Classification Flags" icon={Cpu}>
            <div className="grid grid-cols-2 gap-3">
              <FlagItem label="PII Processing" active={model.isPiiProcessing} />
              <FlagItem label="Financial Model" active={model.isFinancial} />
              <FlagItem label="Critical System" active={model.isCritical} />
              <FlagItem label="Human Oversight" active={model.humanOversight} positive />
            </div>
            <div className="mt-3">
              <InfoRow label="Explainability" value={`${model.explainability}/100`} />
            </div>
          </Section>

          {/* Tags */}
          {model.tags.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-2">
                {model.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Usage stats */}
          {model._count && (
            <Section title="Usage Statistics">
              <InfoRow label="Agents" value={model._count.agents} />
              <InfoRow label="Prompt Logs" value={model._count.promptLogs.toLocaleString()} />
            </Section>
          )}

          {/* Timestamps */}
          <Section title="Timeline">
            <InfoRow label="Registered" value={formatDate(model.createdAt)} />
            <InfoRow label="Last Updated" value={formatDate(model.updatedAt)} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  icon: Icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75 ? "bg-red-500" : value >= 55 ? "bg-orange-500" : value >= 35 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span>{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function FlagItem({ label, active, positive }: { label: string; active: boolean; positive?: boolean }) {
  const on = positive ? active : active;
  const colorOn = positive
    ? "text-green-400 bg-green-500/10 border-green-500/30"
    : "text-red-400 bg-red-500/10 border-red-500/30";
  const colorOff = "text-muted-foreground bg-muted border-border";

  return (
    <div className={`rounded-md border px-3 py-2 text-xs font-medium ${on ? colorOn : colorOff}`}>
      <span className="mr-1">{on ? "●" : "○"}</span>
      {label}
    </div>
  );
}
