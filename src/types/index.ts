// ============================================================
// Shared TypeScript Types — AI Governance Control Tower
// ============================================================

export type UserRole = "ADMIN" | "RISK_OFFICER" | "AUDITOR" | "VIEWER";
export type ModelType = "LLM" | "ML" | "AGENT" | "COMPUTER_VISION" | "NLP" | "RECOMMENDATION";
export type ModelStatus = "ACTIVE" | "INACTIVE" | "DEPRECATED" | "UNDER_REVIEW" | "SUSPENDED";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ComplianceStatus = "PASS" | "FAIL" | "PARTIAL" | "NOT_APPLICABLE" | "PENDING_REVIEW";
export type DataSensitivity = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED" | "PII";
export type AgentStatus = "RUNNING" | "IDLE" | "SUSPENDED" | "ERROR";
export type AlertSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "APPROVE" | "REJECT" | "ESCALATE";
export type ConsentStatus = "GRANTED" | "REVOKED" | "PENDING" | "EXPIRED";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── AI Model ─────────────────────────────────────────────────────────────────

export interface AIModel {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: ModelType;
  status: ModelStatus;
  ownerId: string;
  owner?: Pick<AuthUser, "id" | "name" | "email">;
  department?: string;
  vendor?: string;
  framework?: string;
  endpoint?: string;
  tags: string[];
  isPiiProcessing: boolean;
  isFinancial: boolean;
  isCritical: boolean;
  humanOversight: boolean;
  explainability: number;
  metadata?: Record<string, unknown>;
  riskAssessments?: RiskAssessment[];
  _count?: { agents: number; promptLogs: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelPayload {
  name: string;
  version?: string;
  description?: string;
  type: ModelType;
  status?: ModelStatus;
  department?: string;
  vendor?: string;
  framework?: string;
  endpoint?: string;
  tags?: string[];
  isPiiProcessing?: boolean;
  isFinancial?: boolean;
  isCritical?: boolean;
  humanOversight?: boolean;
  explainability?: number;
  metadata?: Record<string, unknown>;
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export interface RiskAssessment {
  id: string;
  modelId: string;
  assessorId: string;
  assessor?: Pick<AuthUser, "id" | "name">;
  riskLevel: RiskLevel;
  overallScore: number;
  dataSensitivityScore: number;
  modelComplexityScore: number;
  explainabilityScore: number;
  humanOversightScore: number;
  regulatoryExposureScore: number;
  findings?: string;
  mitigations?: string;
  reviewedAt?: string;
  nextReviewDate?: string;
  createdAt: string;
}

export interface RiskScoreBreakdown {
  dataSensitivityScore: number;
  modelComplexityScore: number;
  explainabilityScore: number;
  humanOversightScore: number;
  regulatoryExposureScore: number;
  overallScore: number;
  riskLevel: RiskLevel;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export interface ComplianceControl {
  id: string;
  modelId: string;
  model?: Pick<AIModel, "id" | "name" | "type">;
  framework: string;
  controlId: string;
  controlName: string;
  description?: string;
  status: ComplianceStatus;
  evidence?: string;
  notes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  model?: Pick<AIModel, "id" | "name" | "type">;
  status: AgentStatus;
  systemPrompt?: string;
  tools: string[];
  version: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
  _count?: { promptLogs: number };
  createdAt: string;
  updatedAt: string;
}

// ─── Prompt Log ───────────────────────────────────────────────────────────────

export interface PromptLog {
  id: string;
  agentId?: string;
  agent?: Pick<Agent, "id" | "name">;
  modelId: string;
  model?: Pick<AIModel, "id" | "name">;
  userId?: string;
  sessionId?: string;
  prompt: string;
  systemPrompt?: string;
  toolsUsed: string[];
  response?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  isHallucination: boolean;
  isPolicyViolation: boolean;
  toxicityScore?: number;
  accuracyScore?: number;
  biasScore?: number;
  flagged: boolean;
  flagReason?: string;
  environment: string;
  createdAt: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId?: string;
  user?: Pick<AuthUser, "id" | "name" | "email" | "role">;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  modelId?: string;
  agentId?: string;
  isRead: boolean;
  resolvedAt?: string;
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalModels: number;
  activeModels: number;
  avgRiskScore: number;
  complianceScore: number;
  activeAlerts: number;
  promptCallsThisMonth: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  riskDistribution: Record<string, number>;
  complianceSummary: { status: string; count: number }[];
  usageTrend: { date: string; calls: number }[];
  topRiskyModels: {
    overallScore: number;
    riskLevel: RiskLevel;
    model: Pick<AIModel, "id" | "name" | "type" | "status">;
  }[];
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
