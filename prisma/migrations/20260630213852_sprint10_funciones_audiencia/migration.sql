-- CreateEnum
CREATE TYPE "CanalFuncion" AS ENUM ('PLATAFORMA', 'TAQUILLA', 'INVITADOS', 'EMPRESA');

-- CreateEnum
CREATE TYPE "SegmentoEspectador" AS ENUM ('INDIVIDUAL', 'GRUPO', 'EMPRESA', 'COLEGIO');

-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "segmento" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "modulos" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "funciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "sillasTotales" INTEGER NOT NULL DEFAULT 239,
    "sillasVendidas" INTEGER NOT NULL DEFAULT 0,
    "canal" "CanalFuncion" NOT NULL DEFAULT 'PLATAFORMA',
    "ingresoEstimado" DECIMAL(12,2),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "funciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espectadores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "segmento" "SegmentoEspectador" NOT NULL DEFAULT 'INDIVIDUAL',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "espectadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nps_respuestas" (
    "id" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "funcionId" TEXT NOT NULL,
    "espectadorId" TEXT,

    CONSTRAINT "nps_respuestas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funciones_tenantId_idx" ON "funciones"("tenantId");

-- CreateIndex
CREATE INDEX "espectadores_tenantId_idx" ON "espectadores"("tenantId");

-- CreateIndex
CREATE INDEX "nps_respuestas_funcionId_idx" ON "nps_respuestas"("funcionId");

-- AddForeignKey
ALTER TABLE "funciones" ADD CONSTRAINT "funciones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "espectadores" ADD CONSTRAINT "espectadores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_respuestas" ADD CONSTRAINT "nps_respuestas_funcionId_fkey" FOREIGN KEY ("funcionId") REFERENCES "funciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nps_respuestas" ADD CONSTRAINT "nps_respuestas_espectadorId_fkey" FOREIGN KEY ("espectadorId") REFERENCES "espectadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
