import type { PrismaClient } from "@prisma/client";

/**
 * Qué pasa con lo que "es de" un usuario cuando deja de existir.
 *
 * Clientes, oportunidades, actividades, expedientes y términos definen lo que
 * ve un COMERCIAL (filtro por creadoBy). Si siguen apuntando a un id borrado
 * quedan con un dueño fantasma: sin avatar en el Pipeline e invisibles para el
 * panel "asignar sin dueño" de Equipo, que solo busca creadoBy: null.
 *
 * Esta es la ÚNICA lista de esas tablas: la usan la ruta "Eliminar usuario" y
 * cualquier script que borre usuarios, para que no vuelvan a divergir.
 * (El resto de columnas creadoBy —adjuntos, cambios de etapa, correos— es
 * rastro histórico y no se toca; ver api/usuarios/[id].)
 */
export const TABLAS_CON_DUENO = ["empresa", "oportunidad", "actividad", "expediente", "terminoExpediente"] as const;

/**
 * Operaciones (sin ejecutar) que traspasan a `a` los registros de los usuarios
 * `de`; `a = null` los deja sin dueño. Pensado para ir dentro de un
 * prisma.$transaction([...]) junto con el borrado del usuario.
 */
export function operacionesTraspaso(db: PrismaClient, tenantId: string, de: string[], a: string | null) {
  const where = { tenantId, creadoBy: { in: de } };
  const data = { creadoBy: a };
  return [
    db.empresa.updateMany({ where, data }),
    db.oportunidad.updateMany({ where, data }),
    db.actividad.updateMany({ where, data }),
    db.expediente.updateMany({ where, data }),
    db.terminoExpediente.updateMany({ where, data }),
  ] as const;
}
