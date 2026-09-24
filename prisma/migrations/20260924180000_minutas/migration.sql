-- CreateTable
CREATE TABLE "minutas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resumen" TEXT NOT NULL,
    "asistentes" JSONB NOT NULL DEFAULT '[]',
    "acuerdos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compromisos" JSONB NOT NULL DEFAULT '[]',
    "proximosPasos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riesgos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "textoOriginal" TEXT,
    "creadoBy" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "empresaId" TEXT,
    "actividadId" TEXT,

    CONSTRAINT "minutas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "minutas_tenantId_idx" ON "minutas"("tenantId");

-- CreateIndex
CREATE INDEX "minutas_tenantId_oportunidadId_idx" ON "minutas"("tenantId", "oportunidadId");

-- CreateIndex
CREATE INDEX "minutas_tenantId_empresaId_idx" ON "minutas"("tenantId", "empresaId");

-- AddForeignKey
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minutas" ADD CONSTRAINT "minutas_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

