CREATE TABLE IF NOT EXISTS "cambios_etapa" (
  "id"             TEXT NOT NULL,
  "etapaAnterior"  TEXT NOT NULL,
  "etapaNueva"     TEXT NOT NULL,
  "creadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoBy"       TEXT,
  "creadoByNombre" TEXT,
  "oportunidadId"  TEXT NOT NULL,
  CONSTRAINT "cambios_etapa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cambios_etapa_oportunidadId_idx" ON "cambios_etapa"("oportunidadId");

ALTER TABLE "cambios_etapa"
  ADD CONSTRAINT "cambios_etapa_oportunidadId_fkey"
  FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
