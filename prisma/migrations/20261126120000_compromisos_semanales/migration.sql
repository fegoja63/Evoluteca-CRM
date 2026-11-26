-- AlterTable
ALTER TABLE "contactos" ADD COLUMN     "creadoBy" TEXT;

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "creadoBy" TEXT;

-- CreateTable
CREATE TABLE "metas_actividad" (
    "id" TEXT NOT NULL,
    "contactos" INTEGER NOT NULL DEFAULT 0,
    "negocios" INTEGER NOT NULL DEFAULT 0,
    "llamadas" INTEGER NOT NULL DEFAULT 0,
    "reuniones" INTEGER NOT NULL DEFAULT 0,
    "propuestas" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "metas_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compromisos_semanales" (
    "id" TEXT NOT NULL,
    "semana" TEXT NOT NULL,
    "contactos" INTEGER NOT NULL DEFAULT 0,
    "negocios" INTEGER NOT NULL DEFAULT 0,
    "llamadas" INTEGER NOT NULL DEFAULT 0,
    "reuniones" INTEGER NOT NULL DEFAULT 0,
    "propuestas" INTEGER NOT NULL DEFAULT 0,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "creadoBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "compromisos_semanales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metas_actividad_tenantId_idx" ON "metas_actividad"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "metas_actividad_tenantId_userId_key" ON "metas_actividad"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "compromisos_semanales_tenantId_semana_idx" ON "compromisos_semanales"("tenantId", "semana");

-- CreateIndex
CREATE UNIQUE INDEX "compromisos_semanales_tenantId_userId_semana_key" ON "compromisos_semanales"("tenantId", "userId", "semana");

-- AddForeignKey
ALTER TABLE "metas_actividad" ADD CONSTRAINT "metas_actividad_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_actividad" ADD CONSTRAINT "metas_actividad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromisos_semanales" ADD CONSTRAINT "compromisos_semanales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromisos_semanales" ADD CONSTRAINT "compromisos_semanales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

