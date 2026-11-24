/**
 * ¿Sigue vigente una sesión ya iniciada?
 *
 * La sesión es un JWT firmado que dura hasta 12 horas; sin esto, un usuario
 * desactivado o borrado, o el de una empresa suspendida (por ejemplo, por no
 * pago) o borrada, seguía entrando con su sesión abierta hasta que esta
 * venciera, y un cambio de rol no aplicaba hasta volver a iniciar sesión.
 *
 * El callback `jwt` de lib/auth la consulta en cada lectura de la sesión
 * (páginas, API y middleware). Para no agregar una consulta por clic, el
 * resultado se guarda 60 segundos en memoria por usuario: un cambio tarda como
 * máximo eso en aplicar.
 */
import { prisma } from "@/lib/prisma";

export type EstadoSesion =
  | { vigente: false }
  | { vigente: true; rol: string; tenantNombre: string };

const TTL_MS = 60 * 1000;
const cache = new Map<string, { estado: EstadoSesion; hasta: number }>();

export async function estadoSesion(userId: string, tenantId: string, ahora = Date.now()): Promise<EstadoSesion> {
  const clave = `${tenantId}:${userId}`;
  const guardado = cache.get(clave);
  if (guardado && guardado.hasta > ahora) return guardado.estado;

  const usuario = await prisma.usuario.findFirst({
    where: { id: userId, tenantId },
    select: { activo: true, rol: true, tenant: { select: { activo: true, nombre: true } } },
  });
  const estado: EstadoSesion = usuario && usuario.activo && usuario.tenant.activo
    ? { vigente: true, rol: usuario.rol, tenantNombre: usuario.tenant.nombre }
    : { vigente: false };

  cache.set(clave, { estado, hasta: ahora + TTL_MS });
  // Que el caché no crezca sin límite en un servidor de larga vida.
  if (cache.size > 5000) {
    for (const [k, v] of cache) if (v.hasta <= ahora) cache.delete(k);
  }
  return estado;
}

/** Olvida lo guardado de un usuario (pruebas, o justo después de cambiarlo). */
export function olvidarSesion(userId: string, tenantId: string): void {
  cache.delete(`${tenantId}:${userId}`);
}
