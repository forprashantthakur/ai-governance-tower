-- Run this in your Neon SQL console if `npx prisma db push` keeps timing out
-- Neon dashboard → SQL Editor → paste and run

-- 1. Create the enum type
CREATE TYPE "ArtifactCategory" AS ENUM (
  'BRD',
  'PROJECT_PLAN',
  'TEST_CASES',
  'FRD',
  'DESIGN_DOCUMENT',
  'BUSINESS_CASE',
  'MODEL_ARTIFACT',
  'TRAINING_DATA',
  'EVALUATION_REPORT',
  'COMPLIANCE_EVIDENCE',
  'OTHER'
);

-- 2. Create the table
CREATE TABLE IF NOT EXISTS "project_artifacts" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "project_id"  TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "url"         TEXT         NOT NULL,
  "size"        INTEGER      NOT NULL,
  "mime_type"   TEXT         NOT NULL,
  "category"    "ArtifactCategory" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "version"     TEXT,
  "tags"        TEXT[]       NOT NULL DEFAULT '{}',
  "uploaded_by" TEXT         NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "project_artifacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_artifacts_project_id_fkey"
    FOREIGN KEY ("project_id")
    REFERENCES "projects"("id")
    ON DELETE CASCADE
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS "project_artifacts_project_id_category_idx"
  ON "project_artifacts"("project_id", "category");

CREATE INDEX IF NOT EXISTS "project_artifacts_project_id_uploaded_at_idx"
  ON "project_artifacts"("project_id", "uploaded_at");
