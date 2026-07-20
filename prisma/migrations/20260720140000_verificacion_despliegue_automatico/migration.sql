-- Migración de verificación: NO modifica el esquema ni los datos.
--
-- Existe para comprobar de punta a punta que el despliegue aplica las
-- migraciones por sí solo (el build ejecuta `prisma migrate deploy` antes de
-- compilar). Al llegar a producción debe quedar registrada en el historial
-- sin que nadie la aplique a mano.
--
-- Se conserva en el repositorio como constancia de esa comprobación; borrarla
-- desincronizaría el historial de migraciones.
SELECT 1;
