-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "agenteWebConfig" JSONB,
ADD COLUMN     "agenteWebToken" TEXT;

-- CreateTable
CREATE TABLE "conversaciones_agente" (
    "id" TEXT NOT NULL,
    "secreto" TEXT NOT NULL,
    "mensajes" JSONB NOT NULL DEFAULT '[]',
    "datos" JSONB NOT NULL DEFAULT '{}',
    "calificacion" TEXT,
    "paginaOrigen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "oportunidadId" TEXT,

    CONSTRAINT "conversaciones_agente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversaciones_agente_tenantId_actualizadoEn_idx" ON "conversaciones_agente"("tenantId", "actualizadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_agenteWebToken_key" ON "tenants"("agenteWebToken");

-- AddForeignKey
ALTER TABLE "conversaciones_agente" ADD CONSTRAINT "conversaciones_agente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones_agente" ADD CONSTRAINT "conversaciones_agente_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

