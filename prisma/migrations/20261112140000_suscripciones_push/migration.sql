-- CreateTable
CREATE TABLE "suscripciones_push" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "agente" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "suscripciones_push_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suscripciones_push_tenantId_usuarioId_idx" ON "suscripciones_push"("tenantId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_push_tenantId_endpoint_key" ON "suscripciones_push"("tenantId", "endpoint");

-- AddForeignKey
ALTER TABLE "suscripciones_push" ADD CONSTRAINT "suscripciones_push_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones_push" ADD CONSTRAINT "suscripciones_push_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

