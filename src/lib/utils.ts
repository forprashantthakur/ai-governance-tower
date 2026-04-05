import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(date));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function riskColor(level: string): string {
  const map: Record<string, string> = {
    LOW: "text-green-400",
    MEDIUM: "text-yellow-400",
    HIGH: "text-orange-400",
    CRITICAL: "text-red-400",
  };
  return map[level] ?? "text-muted-foreground";
}

export function riskBgColor(level: string): string {
  const map: Record<string, string> = {
    LOW: "bg-green-500/15 text-green-400 border-green-500/30",
    MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[level] ?? "bg-muted text-muted-foreground";
}

export function complianceColor(status: string): string {
  const map: Record<string, string> = {
    PASS: "bg-green-500/15 text-green-400 border-green-500/30",
    FAIL: "bg-red-500/15 text-red-400 border-red-500/30",
    PARTIAL: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    NOT_APPLICABLE: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    PENDING_REVIEW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    INFO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    WARNING: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    ERROR: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[severity] ?? "bg-muted text-muted-foreground";
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-500/15 text-green-400 border-green-500/30",
    INACTIVE: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    DEPRECATED: "bg-red-500/15 text-red-400 border-red-500/30",
    UNDER_REVIEW: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    SUSPENDED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    RUNNING: "bg-green-500/15 text-green-400 border-green-500/30",
    IDLE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    ERROR: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}
