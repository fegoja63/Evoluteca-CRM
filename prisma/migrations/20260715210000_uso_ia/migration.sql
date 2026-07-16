-- Tope mensual de resúmenes de IA por tenant (palanca de plan). Backfill a 100
-- (plan Pro) para los tenants existentes. null = ilimitado; 0 = desactivada.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "limiteResumenesIA" INTEGER DEFAULT 100;

-- Consumo mensual de resúmenes de IA por tenant.
CREATE TABLE IF NOT EXISTS "uso_ia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "uso_ia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uso_ia_tenantId_periodo_key" ON "uso_ia"("tenantId", "periodo");

DO $$ BEGIN
    ALTER TABLE "uso_ia" ADD CONSTRAINT "uso_ia_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
