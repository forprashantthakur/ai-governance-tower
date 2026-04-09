-- AlterTable: add training_dataset and accuracy_score to ai_models
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "training_dataset" TEXT;
ALTER TABLE "ai_models" ADD COLUMN IF NOT EXISTS "accuracy_score" DOUBLE PRECISION;
