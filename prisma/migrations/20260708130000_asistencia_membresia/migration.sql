-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "NivelMembresia" AS ENUM ('ESPECTADOR', 'FANATICO', 'MECENAS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "espectadores" ADD COLUMN IF NOT EXISTS "nivelMembresia" "NivelMembresia";

-- CreateTable
CREATE TABLE IF NOT EXISTS "asistencias" (
  "id"              TEXT NOT NULL,
  "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "npsSolicitadoEn" TIMESTAMP(3),
  "tenantId"        TEXT NOT NULL,
  "funcionId"       TEXT NOT NULL,
  "espectadorId"    TEXT NOT NULL,
  CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "asistencias_funcionId_espectadorId_key" ON "asistencias"("funcionId", "espectadorId");
CREATE INDEX IF NOT EXISTS "asistencias_tenantId_idx" ON "asistencias"("tenantId");
CREATE INDEX IF NOT EXISTS "asistencias_funcionId_idx" ON "asistencias"("funcionId");
CREATE INDEX IF NOT EXISTS "asistencias_espectadorId_idx" ON "asistencias"("espectadorId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_funcionId_fkey"
    FOREIGN KEY ("funcionId") REFERENCES "funciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_espectadorId_fkey"
    FOREIGN KEY ("espectadorId") REFERENCES "espectadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
