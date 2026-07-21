-- Rescate del segundo factor.
--
-- Sin esto, quien active la verificacion en dos pasos y despues pierda el
-- telefono Y sus codigos de respaldo queda fuera de su cuenta para siempre:
-- se diseno a proposito para que ningun administrador pueda desactivarle el
-- segundo factor a otro, y eso cortaba tambien el camino legitimo de rescate.
--
-- El token lo genera un administrador, pero el enlace va al correo del propio
-- usuario y es el quien confirma. Asi el admin no puede quitarle el segundo
-- factor por su cuenta.
--
-- Idempotente: corre sobre produccion via migrate deploy.

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "reset2faToken" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "reset2faExpiry" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_reset2faToken_key" ON "usuarios"("reset2faToken");
