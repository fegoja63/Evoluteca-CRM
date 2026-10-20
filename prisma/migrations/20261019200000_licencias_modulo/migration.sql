-- CreateEnum
CREATE TYPE "ProductoLicencia" AS ENUM ('FINANZAS');

-- CreateTable
CREATE TABLE "licencias_modulo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "producto" "ProductoLicencia" NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "referenciaPago" TEXT NOT NULL,
    "nota" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocadaEn" TIMESTAMP(3),

    CONSTRAINT "licencias_modulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "licencias_modulo_tenantId_producto_idx" ON "licencias_modulo"("tenantId", "producto");

-- AddForeignKey
ALTER TABLE "licencias_modulo" ADD CONSTRAINT "licencias_modulo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

