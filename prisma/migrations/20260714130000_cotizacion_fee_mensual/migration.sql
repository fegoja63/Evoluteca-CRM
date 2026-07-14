-- Tercera modalidad de cobro: fee mensual fijo durante un horizonte de meses.
ALTER TYPE "ModalidadCotizacion" ADD VALUE IF NOT EXISTS 'FEE_MENSUAL';

ALTER TABLE "cotizaciones" ADD COLUMN IF NOT EXISTS "feeMensual" DECIMAL(14,2);
