-- Campos personalizados por tenant y entidad (Empresa / Oportunidad).
-- La definición vive aquí; el valor de cada registro se guarda en su columna
-- `extras` (JSON) usando `clave` como llave (con prefijo cp_).

CREATE TYPE "EntidadCampo" AS ENUM ('EMPRESA', 'OPORTUNIDAD');
CREATE TYPE "TipoCampo" AS ENUM ('TEXTO', 'NUMERO', 'FECHA', 'LISTA', 'BOOLEANO');

CREATE TABLE "campos_personalizados" (
    "id" TEXT NOT NULL,
    "entidad" "EntidadCampo" NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" "TipoCampo" NOT NULL DEFAULT 'TEXTO',
    "opciones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "campos_personalizados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campos_personalizados_tenantId_entidad_clave_key" ON "campos_personalizados"("tenantId", "entidad", "clave");
CREATE INDEX "campos_personalizados_tenantId_entidad_idx" ON "campos_personalizados"("tenantId", "entidad");

ALTER TABLE "campos_personalizados" ADD CONSTRAINT "campos_personalizados_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
