-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "actividadFinanciera" TEXT;

-- AlterTable
ALTER TABLE "finanzas_periodos" ADD COLUMN     "impuestoRenta" DECIMAL(16,2),
ADD COLUMN     "otrosGastos" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otrosIngresos" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "finanzas_balances" ADD COLUMN     "inversiones" DECIMAL(16,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "finanzas_cierres_anuales" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "ventas" DECIMAL(16,2) NOT NULL,
    "costoVentas" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "gastosAdmin" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "gastosVentas" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "depreciacion" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "intereses" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "otrosIngresos" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "otrosGastos" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "impuestoRenta" DECIMAL(16,2),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_cierres_anuales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finanzas_cierres_anuales_tenantId_anio_key" ON "finanzas_cierres_anuales"("tenantId", "anio");

-- AddForeignKey
ALTER TABLE "finanzas_cierres_anuales" ADD CONSTRAINT "finanzas_cierres_anuales_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

