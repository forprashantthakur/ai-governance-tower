-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RISK_OFFICER', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('LLM', 'ML', 'AGENT', 'COMPUTER_VISION', 'NLP', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED', 'UNDER_REVIEW', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PASS', 'FAIL', 'PARTIAL', 'NOT_APPLICABLE', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'PII');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('RUNNING', 'IDLE', 'SUSPENDED', 'ERROR');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'APPROVE', 'REJECT', 'ESCALATE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'AI_DECISION', 'DATA_SHARING', 'MARKETING');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'PENDING', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "department" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "description" TEXT,
    "type" "ModelType" NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner_id" TEXT NOT NULL,
    "department" TEXT,
    "vendor" TEXT,
    "framework" TEXT,
    "endpoint" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "is_pii_processing" BOOLEAN NOT NULL DEFAULT false,
    "is_financial" BOOLEAN NOT NULL DEFAULT false,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "human_oversight" BOOLEAN NOT NULL DEFAULT true,
    "explainability" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "assessor_id" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "data_sensitivity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "model_complexity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "explainability_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "human_oversight_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regulatory_exposure_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "findings" TEXT,
    "mitigations" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "next_review_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_controls" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "control_name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "evidence" TEXT,
    "notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_assets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "sensitivity" "DataSensitivity" NOT NULL,
    "has_pii" BOOLEAN NOT NULL DEFAULT false,
    "pii_fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "retention_days" INTEGER,
    "location" TEXT,
    "format" TEXT,
    "owner" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_data_assets" (
    "model_id" TEXT NOT NULL,
    "data_asset_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'input',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_data_assets_pkey" PRIMARY KEY ("model_id","data_asset_id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "data_asset_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model_id" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'IDLE',
    "system_prompt" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "max_tokens" INTEGER,
    "temperature" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_logs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT,
    "model_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "prompt" TEXT NOT NULL,
    "system_prompt" TEXT,
    "tools_used" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "response" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "is_hallucination" BOOLEAN NOT NULL DEFAULT false,
    "is_policy_violation" BOOLEAN NOT NULL DEFAULT false,
    "toxicity_score" DOUBLE PRECISION,
    "accuracy_score" DOUBLE PRECISION,
    "bias_score" DOUBLE PRECISION,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "ip_address" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "model_id" TEXT,
    "agent_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "model_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_controls_model_id_framework_control_id_key" ON "compliance_controls"("model_id", "framework", "control_id");

-- CreateIndex
CREATE INDEX "prompt_logs_model_id_created_at_idx" ON "prompt_logs"("model_id", "created_at");

-- CreateIndex
CREATE INDEX "prompt_logs_agent_id_created_at_idx" ON "prompt_logs"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "prompt_logs_flagged_idx" ON "prompt_logs"("flagged");

-- CreateIndex
CREATE INDEX "alerts_is_read_severity_idx" ON "alerts"("is_read", "severity");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "policy_configs_key_key" ON "policy_configs"("key");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_data_assets" ADD CONSTRAINT "model_data_assets_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_data_assets" ADD CONSTRAINT "model_data_assets_data_asset_id_fkey" FOREIGN KEY ("data_asset_id") REFERENCES "data_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_data_asset_id_fkey" FOREIGN KEY ("data_asset_id") REFERENCES "data_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_logs" ADD CONSTRAINT "prompt_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_logs" ADD CONSTRAINT "prompt_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_logs" ADD CONSTRAINT "prompt_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
