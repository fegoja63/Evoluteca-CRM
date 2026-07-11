ALTER TABLE "oportunidades" ADD COLUMN IF NOT EXISTS "eliminadoEn" TIMESTAMP(3);
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "eliminadoEn" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "oportunidades_tenantId_eliminadoEn_idx" ON "oportunidades"("tenantId", "eliminadoEn");
CREATE INDEX IF NOT EXISTS "cotizaciones_tenantId_eliminadoEn_idx" ON "cotizaciones"("tenantId", "eliminadoEn");
