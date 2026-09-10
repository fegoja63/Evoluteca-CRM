-- CreateTable
CREATE TABLE "objeciones" (
    "id" TEXT NOT NULL,
    "categoria" TEXT,
    "objecion" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "loQueNoDecir" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "objeciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objeciones_tenantId_idx" ON "objeciones"("tenantId");

-- AddForeignKey
ALTER TABLE "objeciones" ADD CONSTRAINT "objeciones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
