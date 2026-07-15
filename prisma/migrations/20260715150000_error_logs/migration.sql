-- Registro de errores de producción (monitoreo propio).
CREATE TABLE IF NOT EXISTS "error_logs" (
    "id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "stack" TEXT,
    "url" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'client',
    "tenantId" TEXT,
    "tenantNombre" TEXT,
    "usuarioEmail" TEXT,
    "userAgent" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "error_logs_creadoEn_idx" ON "error_logs"("creadoEn");
