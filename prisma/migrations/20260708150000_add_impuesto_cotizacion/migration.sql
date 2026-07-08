-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "impuestoNombre" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "impuestoPorcentaje" DECIMAL(5,2);
