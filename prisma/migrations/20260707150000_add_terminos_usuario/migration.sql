-- Registra en el repo columnas que ya existen en la base de datos real (Neon)
-- pero nunca tuvieron migracion, igual que paso con Tenant.emailsActivos.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "aceptoTerminosEn" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "versionTerminos" TEXT;
