-- CreateTable
CREATE TABLE "finanzas_supuestos_caja" (
    "tenantId" TEXT NOT NULL,
    "nominaMensual" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "gastosFijosMensuales" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "cuotaDeudaMensual" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "proveedoresSemanales" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "impuestosMensuales" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "ventasContadoSemanales" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "diasCobro" INTEGER NOT NULL DEFAULT 30,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_supuestos_caja_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "finanzas_supuestos_caja" ADD CONSTRAINT "finanzas_supuestos_caja_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

