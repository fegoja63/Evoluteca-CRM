CREATE TABLE IF NOT EXISTS "plantillas_cotizacion" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "nombre"    TEXT NOT NULL,
  "notas"     TEXT,
  "creadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId"  TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "plantillas_cotizacion_tenantId_idx" ON "plantillas_cotizacion"("tenantId");

CREATE TABLE IF NOT EXISTS "items_plantilla_cotizacion" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "descripcion" TEXT NOT NULL,
  "cantidad"    INTEGER NOT NULL DEFAULT 1,
  "precioUnit"  DECIMAL(12,2) NOT NULL,
  "plantillaId" TEXT NOT NULL REFERENCES "plantillas_cotizacion"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "items_plantilla_cotizacion_plantillaId_idx" ON "items_plantilla_cotizacion"("plantillaId");
