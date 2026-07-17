-- Agrega asignación de responsable y estado de avance (3 estados) a las
-- actividades/tareas. Idempotente para poder re-ejecutar con `prisma db execute`.

-- 1. Enum de estado. CREATE TYPE no soporta IF NOT EXISTS, así que se envuelve
--    en un bloque que ignora el error si el tipo ya existe.
DO $$ BEGIN
  CREATE TYPE "EstadoActividad" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Columnas nuevas (idempotentes).
ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "estado" "EstadoActividad" NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "responsableId" TEXT;

-- 3. Backfill:
--    a) las ya completadas pasan a estado COMPLETADA; el resto queda PENDIENTE.
--    b) el responsable inicial de cada tarea es quien la creó, para que las
--       tareas existentes no queden sin responsable. Se filtra con EXISTS para
--       no copiar ids de usuarios ya borrados (violarían la FK del paso 4).
UPDATE "actividades" SET "estado" = 'COMPLETADA' WHERE "completada" = true AND "estado" = 'PENDIENTE';
UPDATE "actividades" a SET "responsableId" = a."creadoBy"
  WHERE a."responsableId" IS NULL AND a."creadoBy" IS NOT NULL
    AND EXISTS (SELECT 1 FROM "usuarios" u WHERE u."id" = a."creadoBy");

-- 4. FK al usuario responsable (SetNull si se borra el usuario).
DO $$ BEGIN
  ALTER TABLE "actividades" ADD CONSTRAINT "actividades_responsableId_fkey"
    FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Índice para filtrar tareas por responsable dentro del tenant.
CREATE INDEX IF NOT EXISTS "actividades_tenantId_responsableId_idx" ON "actividades"("tenantId", "responsableId");
