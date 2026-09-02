-- AlterTable
ALTER TABLE "service_records" ADD COLUMN     "standardized_problem" TEXT;

-- CreateTable
CREATE TABLE "service_problem_suggestions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalized_title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_problem_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_problem_suggestions_normalized_title_key" ON "service_problem_suggestions"("normalized_title");

-- CreateIndex
CREATE INDEX "service_problem_suggestions_is_active_idx" ON "service_problem_suggestions"("is_active");
