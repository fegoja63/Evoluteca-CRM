-- Consecutivo personalizado del cliente para cotizaciones (opcional).
-- Idempotente: seguro de re-ejecutar. El consecutivo automático `numero` se
-- conserva; cuando `numeroManual` tiene valor se muestra en su lugar.
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "numeroManual" TEXT;
