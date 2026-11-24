-- CreateTable
CREATE TABLE "informes_financieros" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "cifras" JSONB NOT NULL,
    "texto" JSONB NOT NULL,
    "creadoBy" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "informes_financieros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "informes_financieros_tenantId_creadoEn_idx" ON "informes_financieros"("tenantId", "creadoEn");

-- AddForeignKey
ALTER TABLE "informes_financieros" ADD CONSTRAINT "informes_financieros_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

