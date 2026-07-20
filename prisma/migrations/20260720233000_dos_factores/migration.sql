-- Verificacion en dos pasos (TOTP), opcional por usuario.
--
-- totpSecret se guarda desde que el usuario EMPIEZA a activarla, pero la
-- segunda verificacion no se exige hasta que totpActivadoEn tiene valor: si
-- se exigiera antes, un fallo a media activacion dejaria al usuario fuera de
-- su propia cuenta.
--
-- codigosRespaldo guarda hashes de bcrypt, no los codigos: en claro serian
-- una segunda contrasena escrita en la base de datos.
--
-- Idempotente: corre sobre produccion via migrate deploy.

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpActivadoEn" TIMESTAMP(3);
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "codigosRespaldo" TEXT[] DEFAULT ARRAY[]::TEXT[];
