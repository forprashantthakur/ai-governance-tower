-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('BUSINESS_CASE', 'DATA_DISCOVERY', 'MODEL_DEVELOPMENT', 'TESTING_VALIDATION', 'DEPLOYMENT', 'MONITORING');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ResourceRole" AS ENUM ('LEAD', 'CONTRIBUTOR', 'REVIEWER', 'STAKEHOLDER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "WorkflowNodeType" AS ENUM ('DATA_SOURCE', 'TRANSFORM', 'MODEL', 'EVALUATION', 'OUTPUT', 'DECISION', 'TRIGGER', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "N8nTriggerEvent" AS ENUM ('PHASE_COMPLETE', 'MILESTONE_REACHED', 'TASK_DONE', 'RISK_THRESHOLD', 'EXPERIMENT_LOGGED');

-- CreateEnum
CREATE TYPE "ProjectHealthStatus" AS ENUM ('HEALTHY', 'AT_RISK', 'CRITICAL', 'UNKNOWN');

-- CreateTable
CREATE TABLE "project_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "scaffold" JSONB NOT NULL,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "current_phase" "ProjectPhase" NOT NULL DEFAULT 'BUSINESS_CASE',
    "owner_id" TEXT NOT NULL,
    "template_id" TEXT,
    "start_date" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "health_score" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "health_status" "ProjectHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "budget" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_phase_records" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "planned_days" INTEGER,
    "actual_days" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_phase_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignee_id" TEXT,
    "reporter_id" TEXT,
    "due_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "estimated_hrs" DOUBLE PRECISION,
    "actual_hrs" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "parent_task_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "target_date" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "is_gate" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_resources" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ResourceRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "allocation_pct" INTEGER NOT NULL DEFAULT 50,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "hourly_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "run_id" TEXT,
    "hyperparams" JSONB,
    "metrics" JSONB,
    "artifacts" JSONB,
    "dataset_ref" TEXT,
    "model_ref" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_runs" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "run_number" INTEGER NOT NULL,
    "hyperparams" JSONB,
    "metrics" JSONB,
    "artifacts" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "duration" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_canvases" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canvas_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_canvases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_webhooks" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "trigger_event" "N8nTriggerEvent" NOT NULL,
    "milestone_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "payload_template" JSONB,
    "last_triggered_at" TIMESTAMP(3),
    "last_status" TEXT,
    "last_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "n8n_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_ai_models" (
    "project_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'output',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_ai_models_pkey" PRIMARY KEY ("project_id","model_id")
);

-- CreateIndex
CREATE INDEX "projects_status_health_status_idx" ON "projects"("status", "health_status");
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");
CREATE UNIQUE INDEX "project_phase_records_project_id_phase_key" ON "project_phase_records"("project_id", "phase");
CREATE INDEX "project_tasks_project_id_phase_status_idx" ON "project_tasks"("project_id", "phase", "status");
CREATE INDEX "project_tasks_assignee_id_idx" ON "project_tasks"("assignee_id");
CREATE INDEX "milestones_project_id_idx" ON "milestones"("project_id");
CREATE UNIQUE INDEX "project_resources_project_id_user_id_key" ON "project_resources"("project_id", "user_id");
CREATE INDEX "experiments_project_id_status_idx" ON "experiments"("project_id", "status");
CREATE UNIQUE INDEX "experiment_runs_experiment_id_run_number_key" ON "experiment_runs"("experiment_id", "run_number");
CREATE INDEX "workflow_canvases_project_id_idx" ON "workflow_canvases"("project_id");
CREATE INDEX "n8n_webhooks_project_id_idx" ON "n8n_webhooks"("project_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "project_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_phase_records" ADD CONSTRAINT "project_phase_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "experiment_runs" ADD CONSTRAINT "experiment_runs_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_canvases" ADD CONSTRAINT "workflow_canvases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "n8n_webhooks" ADD CONSTRAINT "n8n_webhooks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "n8n_webhooks" ADD CONSTRAINT "n8n_webhooks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_ai_models" ADD CONSTRAINT "project_ai_models_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_ai_models" ADD CONSTRAINT "project_ai_models_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
