-- CreateEnum
CREATE TYPE "TaskOrigin" AS ENUM ('CRYOMAP', 'AUVO', 'OTHER');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "external_code" TEXT,
ADD COLUMN     "external_url" TEXT,
ADD COLUMN     "origin" "TaskOrigin" NOT NULL DEFAULT 'CRYOMAP';

-- CreateIndex
CREATE INDEX "tasks_origin_idx" ON "tasks"("origin");

-- CreateIndex
CREATE INDEX "tasks_external_code_idx" ON "tasks"("external_code");
