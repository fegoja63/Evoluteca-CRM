-- Umbral configurable por tenant: días sin movimiento (sin actividad ni cambio
-- de etapa) tras los cuales una oportunidad activa se marca "estancada".
-- Lo leen la señal visual del Pipeline y el correo diario del cron.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "diasEstancamiento" INTEGER NOT NULL DEFAULT 14;
