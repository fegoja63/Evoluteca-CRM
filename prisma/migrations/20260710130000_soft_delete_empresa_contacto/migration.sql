-- AlterTable
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "eliminadoEn" TIMESTAMP(3);
ALTER TABLE "contactos" ADD COLUMN IF NOT EXISTS "eliminadoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "empresas_tenantId_eliminadoEn_idx" ON "empresas"("tenantId", "eliminadoEn");
CREATE INDEX IF NOT EXISTS "contactos_tenantId_eliminadoEn_idx" ON "contactos"("tenantId", "eliminadoEn");
