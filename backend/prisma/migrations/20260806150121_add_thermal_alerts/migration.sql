-- CreateEnum
CREATE TYPE "ThermalAlertType" AS ENUM ('ROOM_TEMPERATURE');

-- CreateEnum
CREATE TYPE "ThermalAlertSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ThermalAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "thermal_alerts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sensor_id" TEXT,
    "reading_id" TEXT,
    "acknowledged_by_user_id" TEXT,
    "type" "ThermalAlertType" NOT NULL DEFAULT 'ROOM_TEMPERATURE',
    "severity" "ThermalAlertSeverity" NOT NULL,
    "status" "ThermalAlertStatus" NOT NULL DEFAULT 'OPEN',
    "temperature" DOUBLE PRECISION,
    "min_temperature" DOUBLE PRECISION,
    "max_temperature" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "thermal_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thermal_alerts_company_id_idx" ON "thermal_alerts"("company_id");

-- CreateIndex
CREATE INDEX "thermal_alerts_room_id_idx" ON "thermal_alerts"("room_id");

-- CreateIndex
CREATE INDEX "thermal_alerts_sensor_id_idx" ON "thermal_alerts"("sensor_id");

-- CreateIndex
CREATE INDEX "thermal_alerts_reading_id_idx" ON "thermal_alerts"("reading_id");

-- CreateIndex
CREATE INDEX "thermal_alerts_status_idx" ON "thermal_alerts"("status");

-- CreateIndex
CREATE INDEX "thermal_alerts_severity_idx" ON "thermal_alerts"("severity");

-- CreateIndex
CREATE INDEX "thermal_alerts_triggered_at_idx" ON "thermal_alerts"("triggered_at");

-- AddForeignKey
ALTER TABLE "thermal_alerts" ADD CONSTRAINT "thermal_alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_alerts" ADD CONSTRAINT "thermal_alerts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_alerts" ADD CONSTRAINT "thermal_alerts_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_alerts" ADD CONSTRAINT "thermal_alerts_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "room_temperature_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_alerts" ADD CONSTRAINT "thermal_alerts_acknowledged_by_user_id_fkey" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
