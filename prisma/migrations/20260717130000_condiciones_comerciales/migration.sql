-- Condiciones comerciales por cliente (se precargan al cotizar) y su copia
-- editable en cada cotización (lo que se muestra en el PDF y el enlace público).
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "condicionesComerciales" TEXT;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "condicionesComerciales" TEXT;
