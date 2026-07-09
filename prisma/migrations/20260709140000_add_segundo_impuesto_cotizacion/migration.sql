-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "impuesto2Nombre" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "impuesto2Porcentaje" DECIMAL(5,2);
