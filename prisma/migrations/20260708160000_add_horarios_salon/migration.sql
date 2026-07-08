-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "horaInicio" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "horaFin" TEXT;
ALTER TABLE "oportunidades" ADD COLUMN IF NOT EXISTS "horaInicio" TEXT;
ALTER TABLE "oportunidades" ADD COLUMN IF NOT EXISTS "horaFin" TEXT;
