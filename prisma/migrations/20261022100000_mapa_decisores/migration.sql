-- CreateEnum
CREATE TYPE "RolDecision" AS ENUM ('DECIDE', 'INFLUYE', 'USA', 'FRENA');

-- CreateEnum
CREATE TYPE "PosturaDecision" AS ENUM ('A_FAVOR', 'NEUTRAL', 'EN_CONTRA', 'SIN_CONTACTAR');

-- CreateTable
CREATE TABLE "participantes_oportunidad" (
    "id" TEXT NOT NULL,
    "rol" "RolDecision" NOT NULL DEFAULT 'INFLUYE',
    "postura" "PosturaDecision" NOT NULL DEFAULT 'SIN_CONTACTAR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "oportunidadId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,

    CONSTRAINT "participantes_oportunidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participantes_oportunidad_tenantId_idx" ON "participantes_oportunidad"("tenantId");

-- CreateIndex
CREATE INDEX "participantes_oportunidad_tenantId_oportunidadId_idx" ON "participantes_oportunidad"("tenantId", "oportunidadId");

-- CreateIndex
CREATE UNIQUE INDEX "participantes_oportunidad_oportunidadId_contactoId_key" ON "participantes_oportunidad"("oportunidadId", "contactoId");

-- AddForeignKey
ALTER TABLE "participantes_oportunidad" ADD CONSTRAINT "participantes_oportunidad_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_oportunidad" ADD CONSTRAINT "participantes_oportunidad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes_oportunidad" ADD CONSTRAINT "participantes_oportunidad_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

