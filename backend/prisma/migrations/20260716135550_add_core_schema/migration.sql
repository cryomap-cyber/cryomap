/*
  Warnings:

  - You are about to drop the column `createdAt` on the `app_settings` table. All the data in the column will be lost.
  - You are about to drop the column `systemName` on the `app_settings` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `app_settings` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `app_settings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MASTER_ADMIN', 'SUPERVISOR', 'CLIENT_USER', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ThermalStatus" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RUNNING', 'STOPPED', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "SensorType" AS ENUM ('TEMPERATURE', 'HUMIDITY', 'TEMPERATURE_HUMIDITY');

-- CreateEnum
CREATE TYPE "ReadingSource" AS ENUM ('MANUAL', 'API', 'MQTT', 'IMPORT');

-- CreateEnum
CREATE TYPE "EquipmentTemperatureSource" AS ENUM ('MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('SERVICE_PHOTO', 'AUVO_REPORT', 'COMPANY_LOGO', 'FLOOR_PLAN', 'OTHER');

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "createdAt",
DROP COLUMN "systemName",
DROP COLUMN "updatedAt",
ADD COLUMN     "business_hours" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "logo_path" TEXT,
ADD COLUMN     "parameters" JSONB,
ADD COLUMN     "system_name" TEXT NOT NULL DEFAULT 'CryoMap',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "responsible_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "job_title" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "min_temperature" DOUBLE PRECISION,
    "max_temperature" DOUBLE PRECISION,
    "current_temperature" DOUBLE PRECISION,
    "thermal_status" "ThermalStatus" NOT NULL DEFAULT 'OFFLINE',
    "map_x" DOUBLE PRECISION,
    "map_y" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "model" TEXT,
    "manufacturer" TEXT,
    "serial_number" TEXT,
    "setpoint" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "current_temperature" DOUBLE PRECISION,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "SensorType" NOT NULL DEFAULT 'TEMPERATURE_HUMIDITY',
    "location" TEXT,
    "status" "SensorStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_seen_at" TIMESTAMP(3),
    "last_temperature" DOUBLE PRECISION,
    "last_humidity" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_temperature_readings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sensor_id" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION,
    "source" "ReadingSource" NOT NULL DEFAULT 'MANUAL',
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_temperature_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_temperature_readings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT,
    "equipment_id" TEXT NOT NULL,
    "created_by_user_id" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL,
    "source" "EquipmentTemperatureSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_temperature_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT,
    "equipment_id" TEXT,
    "assigned_to_user_id" TEXT,
    "created_by_user_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "scheduled_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_records" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT,
    "equipment_id" TEXT,
    "technician_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "downtime_minutes" INTEGER,
    "problem_found" TEXT,
    "service_performed" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "service_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "task_id" TEXT,
    "service_record_id" TEXT,
    "uploaded_by_user_id" TEXT,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER,
    "path" TEXT NOT NULL,
    "type" "AttachmentType" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "rooms_company_id_idx" ON "rooms"("company_id");

-- CreateIndex
CREATE INDEX "equipments_company_id_idx" ON "equipments"("company_id");

-- CreateIndex
CREATE INDEX "equipments_room_id_idx" ON "equipments"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipments_company_id_code_key" ON "equipments"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_code_key" ON "sensors"("code");

-- CreateIndex
CREATE INDEX "sensors_company_id_idx" ON "sensors"("company_id");

-- CreateIndex
CREATE INDEX "sensors_room_id_idx" ON "sensors"("room_id");

-- CreateIndex
CREATE INDEX "room_temperature_readings_company_id_read_at_idx" ON "room_temperature_readings"("company_id", "read_at");

-- CreateIndex
CREATE INDEX "room_temperature_readings_room_id_read_at_idx" ON "room_temperature_readings"("room_id", "read_at");

-- CreateIndex
CREATE INDEX "room_temperature_readings_sensor_id_read_at_idx" ON "room_temperature_readings"("sensor_id", "read_at");

-- CreateIndex
CREATE INDEX "equipment_temperature_readings_company_id_measured_at_idx" ON "equipment_temperature_readings"("company_id", "measured_at");

-- CreateIndex
CREATE INDEX "equipment_temperature_readings_equipment_id_measured_at_idx" ON "equipment_temperature_readings"("equipment_id", "measured_at");

-- CreateIndex
CREATE INDEX "equipment_temperature_readings_created_by_user_id_idx" ON "equipment_temperature_readings"("created_by_user_id");

-- CreateIndex
CREATE INDEX "tasks_company_id_idx" ON "tasks"("company_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_scheduled_date_idx" ON "tasks"("scheduled_date");

-- CreateIndex
CREATE INDEX "tasks_assigned_to_user_id_idx" ON "tasks"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "tasks_equipment_id_idx" ON "tasks"("equipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_records_task_id_key" ON "service_records"("task_id");

-- CreateIndex
CREATE INDEX "service_records_company_id_idx" ON "service_records"("company_id");

-- CreateIndex
CREATE INDEX "service_records_technician_id_idx" ON "service_records"("technician_id");

-- CreateIndex
CREATE INDEX "service_records_equipment_id_idx" ON "service_records"("equipment_id");

-- CreateIndex
CREATE INDEX "service_records_started_at_idx" ON "service_records"("started_at");

-- CreateIndex
CREATE INDEX "attachments_company_id_idx" ON "attachments"("company_id");

-- CreateIndex
CREATE INDEX "attachments_task_id_idx" ON "attachments"("task_id");

-- CreateIndex
CREATE INDEX "attachments_service_record_id_idx" ON "attachments"("service_record_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_user_id_idx" ON "attachments"("uploaded_by_user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_temperature_readings" ADD CONSTRAINT "room_temperature_readings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_temperature_readings" ADD CONSTRAINT "room_temperature_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_temperature_readings" ADD CONSTRAINT "room_temperature_readings_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_temperature_readings" ADD CONSTRAINT "equipment_temperature_readings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_temperature_readings" ADD CONSTRAINT "equipment_temperature_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_temperature_readings" ADD CONSTRAINT "equipment_temperature_readings_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_temperature_readings" ADD CONSTRAINT "equipment_temperature_readings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_service_record_id_fkey" FOREIGN KEY ("service_record_id") REFERENCES "service_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
