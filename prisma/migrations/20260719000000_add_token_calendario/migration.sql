-- Token secreto y revocable para suscribir la agenda personal de cada usuario
-- a un calendario externo (Google/Outlook/Apple) vía /api/calendario/{token}.ics.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "tokenCalendario" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_tokenCalendario_key" ON "usuarios"("tokenCalendario");
