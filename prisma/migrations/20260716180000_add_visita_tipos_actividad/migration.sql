-- Agrega los tipos de actividad "Visita comercial" y "Visita técnica" al enum
-- TipoActividad. Idempotente (ADD VALUE IF NOT EXISTS) para poder re-ejecutar
-- con prisma db execute sin romper si ya existen.
ALTER TYPE "TipoActividad" ADD VALUE IF NOT EXISTS 'VISITA_COMERCIAL';
ALTER TYPE "TipoActividad" ADD VALUE IF NOT EXISTS 'VISITA_TECNICA';
