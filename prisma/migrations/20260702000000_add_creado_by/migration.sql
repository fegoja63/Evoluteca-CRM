ALTER TABLE "oportunidades" ADD COLUMN IF NOT EXISTS "creadoBy" TEXT;
ALTER TABLE "empresas"      ADD COLUMN IF NOT EXISTS "creadoBy" TEXT;
ALTER TABLE "actividades"   ADD COLUMN IF NOT EXISTS "creadoBy" TEXT;
