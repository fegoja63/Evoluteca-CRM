-- Modalidad de cobro de la cotización + campos de success fee + líneas de ahorro.

-- Enum ModalidadCotizacion (CREATE TYPE no soporta IF NOT EXISTS: se usa un bloque).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ModalidadCotizacion') THEN
    CREATE TYPE "ModalidadCotizacion" AS ENUM ('FEE_FIJO', 'SUCCESS_FEE');
  END IF;
END$$;

-- Campos en cotizaciones.
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "modalidad" "ModalidadCotizacion" NOT NULL DEFAULT 'FEE_FIJO';
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "porcentajeHonorarios" DECIMAL(5,2);
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "horizonteMeses" INTEGER;

-- Tabla de líneas de ahorro estimado.
CREATE TABLE IF NOT EXISTS "lineas_ahorro" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "gastoBaseMensual" DECIMAL(14,2) NOT NULL,
    "ahorroEstimadoMensual" DECIMAL(14,2) NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    CONSTRAINT "lineas_ahorro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lineas_ahorro_cotizacionId_idx" ON "lineas_ahorro"("cotizacionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lineas_ahorro_cotizacionId_fkey') THEN
    ALTER TABLE "lineas_ahorro" ADD CONSTRAINT "lineas_ahorro_cotizacionId_fkey"
      FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
