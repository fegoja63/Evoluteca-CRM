-- CreateTable
CREATE TABLE "finanzas_cuentas_por_cobrar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "monto" DECIMAL(16,2) NOT NULL,
    "vence" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finanzas_cuentas_por_cobrar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finanzas_cuentas_por_cobrar_tenantId_vence_idx" ON "finanzas_cuentas_por_cobrar"("tenantId", "vence");

-- AddForeignKey
ALTER TABLE "finanzas_cuentas_por_cobrar" ADD CONSTRAINT "finanzas_cuentas_por_cobrar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

