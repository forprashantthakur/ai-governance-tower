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

// ─── AI Project Management ────────────────────────────────────────────────────

export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectPhase = "BUSINESS_CASE" | "DATA_DISCOVERY" | "MODEL_DEVELOPMENT" | "TESTING_VALIDATION" | "DEPLOYMENT" | "MONITORING";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ResourceRole = "LEAD" | "CONTRIBUTOR" | "REVIEWER" | "STAKEHOLDER" | "OBSERVER";
export type WorkflowNodeType = "DATA_SOURCE" | "TRANSFORM" | "MODEL" | "EVALUATION" | "OUTPUT" | "DECISION" | "TRIGGER" | "NOTIFICATION";
export type N8nTriggerEvent = "PHASE_COMPLETE" | "MILESTONE_REACHED" | "TASK_DONE" | "RISK_THRESHOLD" | "EXPERIMENT_LOGGED";
export type ProjectHealthStatus = "HEALTHY" | "AT_RISK" | "CRITICAL" | "UNKNOWN";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  currentPhase: ProjectPhase;
  ownerId: string;
  owner?: Pick<AuthUser, "id" | "name" | "email">;
  templateId?: string;
  startDate?: string;
  targetDate?: string;
  completedAt?: string;
  healthScore: number;
  healthStatus: ProjectHealthStatus;
  budget?: number;
  tags: string[];
  metadata?: Record<string, unknown>;
  _count?: { tasks: number; experiments: number; milestones: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhaseRecord {
  id: string;
  projectId: string;
  phase: ProjectPhase;
  status: TaskStatus;
  startDate?: string;
  endDate?: string;
  plannedDays?: number;
  actualDays?: number;
  progress: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  phase: ProjectPhase;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assignee?: Pick<AuthUser, "id" | "name">;
  reporterId?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHrs?: number;
  actualHrs?: number;
  sortOrder: number;
  parentTaskId?: string;
  tags: string[];
  completedAt?: string;
  subtasks?: ProjectTask[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  phase: ProjectPhase;
  name: string;
  description?: string;
  targetDate: string;
  completedAt?: string;
  completedBy?: string;
  isGate: boolean;
  createdAt: string;
}

export interface ProjectResource {
  id: string;
  projectId: string;
  userId: string;
  user?: Pick<AuthUser, "id" | "name" | "email" | "role">;
  role: ResourceRole;
  allocationPct: number;
  startDate?: string;
  endDate?: string;
  hourlyRate?: number;
  createdAt: string;
}

export interface Experiment {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: string;
  runId?: string;
  hyperparams?: Record<string, unknown>;
  metrics?: Record<string, number>;
  artifacts?: { name: string; type: string; url: string }[];
  datasetRef?: string;
  modelRef?: string;
  startedAt: string;
  completedAt?: string;
  createdBy: string;
  notes?: string;
  tags: string[];
  runs?: ExperimentRun[];
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  runNumber: number;
  hyperparams?: Record<string, unknown>;
  metrics?: Record<string, number>;
  artifacts?: { name: string; type: string; url: string }[];
  status: string;
  duration?: number;
  notes?: string;
  createdAt: string;
}

export interface CanvasNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
}

export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
}

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface WorkflowCanvas {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  canvasData: { nodes: CanvasNode[]; edges: CanvasEdge[]; viewport: CanvasViewport };
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nWebhook {
  id: string;
  projectId: string;
  name: string;
  webhookUrl: string;
  triggerEvent: N8nTriggerEvent;
  milestoneId?: string;
  isActive: boolean;
  payloadTemplate?: Record<string, unknown>;
  lastTriggeredAt?: string;
  lastStatus?: string;
  lastResponse?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAIModel {
  projectId: string;
  modelId: string;
  model?: Pick<AIModel, "id" | "name" | "type" | "status">;
  role: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  scaffold: TemplateScaffold;
  isBuiltIn: boolean;
  createdAt: string;
}

export interface TemplateScaffold {
  phases: { phase: ProjectPhase; plannedDays: number }[];
  tasks: { phase: ProjectPhase; title: string; priority: TaskPriority; estimatedHrs: number; description?: string }[];
  milestones: { phase: ProjectPhase; name: string; daysFromStart: number; isGate: boolean }[];
  workflowCanvas?: { nodes: CanvasNode[]; edges: CanvasEdge[] };
}

export interface PortfolioStats {
  totalProjects: number;
  byStatus: Record<ProjectStatus, number>;
  byPhase: Record<ProjectPhase, number>;
  avgHealthScore: number;
  atRiskCount: number;
  criticalCount: number;
  recentActivity: { projectId: string; projectName: string; action: string; at: string }[];
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
