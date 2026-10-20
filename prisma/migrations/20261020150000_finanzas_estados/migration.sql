-- CreateTable
CREATE TABLE "finanzas_periodos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "ventas" DECIMAL(16,2) NOT NULL,
    "costoVentas" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "gastosAdmin" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "gastosVentas" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "depreciacion" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "intereses" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finanzas_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "corte" TIMESTAMP(3) NOT NULL,
    "caja" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "cuentasPorCobrar" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "inventario" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "otrosActivosCorrientes" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "activosFijos" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "proveedores" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "obligacionesCP" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "impuestosLaborales" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "deudaLP" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "patrimonio" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finanzas_periodos_tenantId_mes_key" ON "finanzas_periodos"("tenantId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "finanzas_balances_tenantId_corte_key" ON "finanzas_balances"("tenantId", "corte");

-- AddForeignKey
ALTER TABLE "finanzas_periodos" ADD CONSTRAINT "finanzas_periodos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finanzas_balances" ADD CONSTRAINT "finanzas_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

