CREATE TABLE IF NOT EXISTS "metas_vendedor" (
  "id"       TEXT NOT NULL,
  "anio"     INTEGER NOT NULL,
  "mes"      INTEGER NOT NULL,
  "meta"     DECIMAL(14,2) NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  CONSTRAINT "metas_vendedor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "metas_vendedor_tenantId_userId_anio_mes_key" UNIQUE ("tenantId","userId","anio","mes")
);

CREATE INDEX IF NOT EXISTS "metas_vendedor_tenantId_idx" ON "metas_vendedor"("tenantId");

ALTER TABLE "metas_vendedor"
  ADD CONSTRAINT "metas_vendedor_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "metas_vendedor"
  ADD CONSTRAINT "metas_vendedor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
