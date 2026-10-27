-- CreateTable
CREATE TABLE "analisis_cliente" (
    "id" TEXT NOT NULL,
    "fuentes" TEXT NOT NULL,
    "situacion" TEXT NOT NULL,
    "desafios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "objetivos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "plazo" TEXT,
    "exito" TEXT,
    "dondeAyudar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preguntas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creadoBy" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "analisis_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analisis_cliente_empresaId_key" ON "analisis_cliente"("empresaId");

-- CreateIndex
CREATE INDEX "analisis_cliente_tenantId_idx" ON "analisis_cliente"("tenantId");

-- AddForeignKey
ALTER TABLE "analisis_cliente" ADD CONSTRAINT "analisis_cliente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_cliente" ADD CONSTRAINT "analisis_cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

