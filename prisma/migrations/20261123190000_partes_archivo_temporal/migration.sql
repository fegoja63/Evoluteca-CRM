-- CreateTable
CREATE TABLE "partes_archivo_temporal" (
    "id" TEXT NOT NULL,
    "subidaId" TEXT NOT NULL,
    "indice" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "datos" BYTEA NOT NULL,
    "creadoBy" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "partes_archivo_temporal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partes_archivo_temporal_tenantId_creadoEn_idx" ON "partes_archivo_temporal"("tenantId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "partes_archivo_temporal_subidaId_indice_key" ON "partes_archivo_temporal"("subidaId", "indice");

-- AddForeignKey
ALTER TABLE "partes_archivo_temporal" ADD CONSTRAINT "partes_archivo_temporal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

