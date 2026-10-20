-- CreateTable
CREATE TABLE "finanzas_rentabilidad_clientes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "ventas" DECIMAL(16,2) NOT NULL,
    "costo" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "diasPago" INTEGER,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finanzas_rentabilidad_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finanzas_rentabilidad_clientes_tenantId_idx" ON "finanzas_rentabilidad_clientes"("tenantId");

-- AddForeignKey
ALTER TABLE "finanzas_rentabilidad_clientes" ADD CONSTRAINT "finanzas_rentabilidad_clientes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

