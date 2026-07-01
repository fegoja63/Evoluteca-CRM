-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioBase" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas_venta" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER,
    "valorObjetivo" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "metas_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_timeline" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    "empresaId" TEXT,
    "contactoId" TEXT,

    CONSTRAINT "eventos_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "productos_tenantId_idx" ON "productos"("tenantId");

-- CreateIndex
CREATE INDEX "metas_venta_tenantId_idx" ON "metas_venta"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "metas_venta_tenantId_anio_mes_key" ON "metas_venta"("tenantId", "anio", "mes");

-- CreateIndex
CREATE INDEX "eventos_timeline_tenantId_idx" ON "eventos_timeline"("tenantId");

-- CreateIndex
CREATE INDEX "eventos_timeline_empresaId_idx" ON "eventos_timeline"("empresaId");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_venta" ADD CONSTRAINT "metas_venta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_timeline" ADD CONSTRAINT "eventos_timeline_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
