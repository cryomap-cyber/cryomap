-- AlterTable
ALTER TABLE "equipment_temperature_readings" ADD COLUMN     "air_flow" DOUBLE PRECISION,
ADD COLUMN     "discharge_pressure" DOUBLE PRECISION,
ADD COLUMN     "evaporation_temperature" DOUBLE PRECISION,
ADD COLUMN     "liquid_line_temperature" DOUBLE PRECISION,
ADD COLUMN     "subcooling" DOUBLE PRECISION,
ADD COLUMN     "suction_pressure" DOUBLE PRECISION,
ADD COLUMN     "superheating" DOUBLE PRECISION;
