-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('ACTIVA', 'COMPLETADA', 'DETENIDA');

-- CreateTable
CREATE TABLE "secuencias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "pasos" JSONB NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoBy" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "secuencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones_secuencia" (
    "id" TEXT NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'ACTIVA',
    "motivoFin" TEXT,
    "pasoSiguiente" INTEGER NOT NULL DEFAULT 0,
    "proximoEnvio" TIMESTAMP(3),
    "enviados" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEn" TIMESTAMP(3),
    "tenantId" TEXT NOT NULL,
    "secuenciaId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "oportunidadId" TEXT,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "inscripciones_secuencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "secuencias_tenantId_idx" ON "secuencias"("tenantId");

-- CreateIndex
CREATE INDEX "inscripciones_secuencia_tenantId_idx" ON "inscripciones_secuencia"("tenantId");

-- CreateIndex
CREATE INDEX "inscripciones_secuencia_tenantId_contactoId_idx" ON "inscripciones_secuencia"("tenantId", "contactoId");

-- CreateIndex
CREATE INDEX "inscripciones_secuencia_estado_proximoEnvio_idx" ON "inscripciones_secuencia"("estado", "proximoEnvio");

-- AddForeignKey
ALTER TABLE "secuencias" ADD CONSTRAINT "secuencias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_secuencia" ADD CONSTRAINT "inscripciones_secuencia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_secuencia" ADD CONSTRAINT "inscripciones_secuencia_secuenciaId_fkey" FOREIGN KEY ("secuenciaId") REFERENCES "secuencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_secuencia" ADD CONSTRAINT "inscripciones_secuencia_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_secuencia" ADD CONSTRAINT "inscripciones_secuencia_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_secuencia" ADD CONSTRAINT "inscripciones_secuencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

