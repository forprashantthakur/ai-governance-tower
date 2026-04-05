import { cn, riskBgColor, complianceColor, statusColor, severityColor } from "@/lib/utils";
import type { RiskLevel, ComplianceStatus, ModelStatus, AlertSeverity } from "@/types";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        riskBgColor(level),
        className
      )}
    >
      {level}
    </span>
  );
}

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  className?: string;
}

export function ComplianceBadge({ status, className }: ComplianceBadgeProps) {
  const labels: Record<ComplianceStatus, string> = {
    PASS: "Pass",
    FAIL: "Fail",
    PARTIAL: "Partial",
    NOT_APPLICABLE: "N/A",
    PENDING_REVIEW: "Pending",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        complianceColor(status),
        className
      )}
    >
      {labels[status]}
    </span>
  );
}

interface StatusBadgeProps {
  status: ModelStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        statusColor(status),
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        severityColor(severity),
        className
      )}
    >
      {severity}
    </span>
  );
}
