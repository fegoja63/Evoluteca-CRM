-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "terminosAceptadosEn" TIMESTAMP(3),
ADD COLUMN     "terminosAceptadosPor" TEXT,
ADD COLUMN     "terminosVersion" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "esTitular" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: marcar como TITULAR al administrador más antiguo de cada tenant
-- (el primer usuario creado, que representa a la empresa).
UPDATE "usuarios" SET "esTitular" = true
WHERE id IN (
  SELECT DISTINCT ON ("tenantId") id
  FROM "usuarios"
  WHERE "rol" = 'ADMINISTRADOR'
  ORDER BY "tenantId", "creadoEn" ASC
);

-- Backfill: si alguien del tenant ya había aceptado los términos (modelo viejo,
-- por usuario), se sube esa aceptación al nivel de TENANT usando la más antigua.
UPDATE "tenants" t SET
  "terminosAceptadosEn"  = sub.en,
  "terminosVersion"      = '1.0',
  "terminosAceptadosPor" = sub.uid
FROM (
  SELECT DISTINCT ON ("tenantId") "tenantId", "aceptoTerminosEn" AS en, id AS uid
  FROM "usuarios"
  WHERE "aceptoTerminosEn" IS NOT NULL
  ORDER BY "tenantId", "aceptoTerminosEn" ASC
) sub
WHERE t.id = sub."tenantId";

-- Backfill: quien nunca aceptó (bajo el modelo viejo nunca pasó del gate, así
-- que no tiene uso real) debe cambiar su clave temporal en el próximo ingreso.
UPDATE "usuarios" SET "debeCambiarPassword" = true
WHERE "aceptoTerminosEn" IS NULL;
