CREATE TABLE IF NOT EXISTS "etapas_pipeline" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "etapas_pipeline_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "etapas_pipeline_tenantId_key_key" ON "etapas_pipeline"("tenantId", "key");
CREATE INDEX IF NOT EXISTS "etapas_pipeline_tenantId_idx" ON "etapas_pipeline"("tenantId");

ALTER TABLE "etapas_pipeline" ADD CONSTRAINT "etapas_pipeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
