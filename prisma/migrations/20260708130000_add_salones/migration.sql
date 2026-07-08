-- CreateTable
CREATE TABLE IF NOT EXISTS "salones" (
  "id"          TEXT NOT NULL,
  "nombre"      TEXT NOT NULL,
  "capacidad"   INTEGER,
  "descripcion" TEXT,
  "activo"      BOOLEAN NOT NULL DEFAULT true,
  "creadoEn"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId"    TEXT NOT NULL,
  CONSTRAINT "salones_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "salonId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "salones_tenantId_idx" ON "salones"("tenantId");
CREATE INDEX IF NOT EXISTS "cotizaciones_salonId_fechaEvento_idx" ON "cotizaciones"("salonId", "fechaEvento");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "salones" ADD CONSTRAINT "salones_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_salonId_fkey"
    FOREIGN KEY ("salonId") REFERENCES "salones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
