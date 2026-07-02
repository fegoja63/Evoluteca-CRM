ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "tokenPublico" TEXT UNIQUE;
ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "motivoRechazo" TEXT;
