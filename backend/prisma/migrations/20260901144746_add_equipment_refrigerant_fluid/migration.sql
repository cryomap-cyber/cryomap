-- CreateEnum
CREATE TYPE "RefrigerantFluid" AS ENUM ('R22', 'R32', 'R410A', 'R134A', 'R404A', 'R407C');

-- AlterTable
ALTER TABLE "equipments" ADD COLUMN     "refrigerant_fluid" "RefrigerantFluid";
