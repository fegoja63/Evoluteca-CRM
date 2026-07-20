-- Cierra la deriva entre prisma/migrations y prisma/schema.prisma.
--
-- El problema: reconstruir la base solo desde estas migraciones NO daba el
-- esquema que el codigo espera. La base real (produccion y desarrollo) si
-- tenia estas cosas, pero porque se aplicaron a mano en su momento, no por
-- una migracion. Resultado: si algun dia hubiera que levantar la base desde
-- cero — una restauracion de respaldo, un ambiente nuevo — habria salido
-- distinta, y el error habria aparecido en el peor momento posible.
--
-- Se descubrio al crear la rama "test" de Neon para las pruebas de
-- aislamiento: al construirse solo desde migraciones, salio incompleta.
--
-- Todo aqui es idempotente y seguro de correr sobre una base que YA tiene
-- estos cambios: es exactamente lo que va a pasar en produccion, donde el
-- `prisma migrate deploy` del build la aplicara sobre datos reales.

-- 1. Columna que existia en la base real pero no en ninguna migracion.
--    (La migracion 20260707150000_add_terminos_usuario ya dejaba anotado
--    este pendiente en su comentario de cabecera.)
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "emailsActivos" BOOLEAN NOT NULL DEFAULT true;

-- 2. Las dos llaves foraneas de plantillas de cotizacion se crearon en linea
--    (20260703000000) con ON DELETE CASCADE pero sin ON UPDATE CASCADE, que
--    es el valor por defecto de Prisma. El borrado en cascada ya funcionaba
--    bien; se alinea el ON UPDATE para que `prisma migrate diff` pueda volver
--    a salir limpio y sirva como senal confiable de deriva futura.
ALTER TABLE "plantillas_cotizacion" DROP CONSTRAINT IF EXISTS "plantillas_cotizacion_tenantId_fkey";
ALTER TABLE "plantillas_cotizacion" ADD CONSTRAINT "plantillas_cotizacion_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "items_plantilla_cotizacion" DROP CONSTRAINT IF EXISTS "items_plantilla_cotizacion_plantillaId_fkey";
ALTER TABLE "items_plantilla_cotizacion" ADD CONSTRAINT "items_plantilla_cotizacion_plantillaId_fkey"
  FOREIGN KEY ("plantillaId") REFERENCES "plantillas_cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
