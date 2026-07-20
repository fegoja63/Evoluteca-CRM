-- Registro de auditoria: quien hizo que, cuando y sobre que.
--
-- La papelera y la linea de tiempo cuentan que le paso a un registro, pero no
-- quien lo hizo. En las compras de gobierno y sector financiero la
-- trazabilidad de auditoria suele ser requisito de pliego.
--
-- Solo se inserta aqui: la aplicacion nunca edita ni borra estas filas. Es lo
-- que las hace valer como evidencia.
--
-- Idempotente, como el resto: corre sobre produccion via migrate deploy.

CREATE TABLE IF NOT EXISTS "registros_auditoria" (
    "id"            TEXT NOT NULL,
    "usuarioId"     TEXT,
    "usuarioEmail"  TEXT,
    "usuarioNombre" TEXT,
    "usuarioRol"    TEXT,
    "accion"        TEXT NOT NULL,
    "entidad"       TEXT NOT NULL,
    "entidadId"     TEXT,
    "descripcion"   TEXT,
    "antes"         JSONB,
    "despues"       JSONB,
    "ip"            TEXT,
    "userAgent"     TEXT,
    "creadoEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId"      TEXT NOT NULL,

    CONSTRAINT "registros_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "registros_auditoria_tenantId_creadoEn_idx"
  ON "registros_auditoria"("tenantId", "creadoEn");

CREATE INDEX IF NOT EXISTS "registros_auditoria_tenantId_entidad_entidadId_idx"
  ON "registros_auditoria"("tenantId", "entidad", "entidadId");

CREATE INDEX IF NOT EXISTS "registros_auditoria_tenantId_usuarioId_idx"
  ON "registros_auditoria"("tenantId", "usuarioId");

ALTER TABLE "registros_auditoria" DROP CONSTRAINT IF EXISTS "registros_auditoria_tenantId_fkey";
ALTER TABLE "registros_auditoria" ADD CONSTRAINT "registros_auditoria_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
