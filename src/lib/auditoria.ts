import { prisma } from "@/lib/prisma";
import { obtenerIp } from "@/lib/rate-limit";

/**
 * Registro de auditoría: quién hizo qué, cuándo y sobre qué.
 *
 * La papelera y la línea de tiempo ya cuentan qué le pasó a un registro, pero
 * no quién lo hizo. Esto responde "¿quién borró este cliente?" — que en el día
 * a día evita discusiones, y en las compras de gobierno y sector financiero
 * suele ser requisito de pliego.
 */

export type AccionAuditada =
  | "CREAR"
  | "ACTUALIZAR"
  | "ELIMINAR"
  | "RESTAURAR"
  | "ELIMINAR_DEFINITIVO"
  | "CAMBIAR_ROL"
  | "DESACTIVAR_USUARIO"
  | "ACTIVAR_USUARIO"
  | "CAMBIAR_CONFIGURACION"
  | "INICIAR_SESION"
  | "INICIAR_SESION_FALLIDO"
  | "EXPORTAR";

/**
 * Campos que NUNCA se guardan en el registro.
 *
 * Un registro de auditoría es, por definición, un sitio donde queda todo
 * escrito para siempre y al que mira más gente que a la tabla original. Meter
 * ahí una contraseña o una llave de API convierte la trazabilidad en una fuga.
 */
const CAMPOS_SENSIBLES = new Set([
  "passwordHash",
  "password",
  "resetToken",
  "resetTokenExpiry",
  "tokenCalendario",
  "apiKeyLeads",
  "tokenPublico",
  "datos", // contenido en base64 de los adjuntos: pesado e innecesario aquí
]);

/** Quita los campos sensibles antes de guardar. */
export function limpiar(valor: unknown): unknown {
  if (!valor || typeof valor !== "object") return valor ?? null;
  if (Array.isArray(valor)) return valor.map(limpiar);

  const limpio: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CAMPOS_SENSIBLES.has(clave)) {
      limpio[clave] = "[oculto]";
    } else if (v instanceof Date) {
      limpio[clave] = v.toISOString();
    } else if (v && typeof v === "object") {
      limpio[clave] = limpiar(v);
    } else {
      limpio[clave] = v;
    }
  }
  return limpio;
}

export type DatosAuditoria = {
  tenantId: string;
  usuario?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    rol?: string | null;
  } | null;
  accion: AccionAuditada;
  /** Nombre del modelo afectado: "Oportunidad", "Usuario"... */
  entidad: string;
  entidadId?: string | null;
  /** Resumen legible, para que la pantalla se entienda sin leer los JSON. */
  descripcion?: string | null;
  antes?: unknown;
  despues?: unknown;
  /** Para sacar IP y navegador. */
  peticion?: Request | null;
};

function aFila(datos: DatosAuditoria) {
  return {
    tenantId: datos.tenantId,
    // Se copian nombre/correo/rol además del id: el usuario puede cambiar de
    // rol o ser dado de baja después, y el registro debe seguir contando lo
    // que era cierto en su momento.
    usuarioId: datos.usuario?.id ?? null,
    usuarioEmail: datos.usuario?.email ?? null,
    usuarioNombre: datos.usuario?.name ?? null,
    usuarioRol: datos.usuario?.rol ?? null,
    accion: datos.accion,
    entidad: datos.entidad,
    entidadId: datos.entidadId ?? null,
    descripcion: datos.descripcion ?? null,
    antes: (limpiar(datos.antes) ?? undefined) as never,
    despues: (limpiar(datos.despues) ?? undefined) as never,
    ip: datos.peticion ? obtenerIp(datos.peticion) : null,
    userAgent: datos.peticion?.headers.get("user-agent")?.slice(0, 400) ?? null,
  };
}

/**
 * Devuelve la operación SIN ejecutarla, para meterla en el mismo
 * `prisma.$transaction` que el cambio que se está auditando.
 *
 * Es la forma preferible: o quedan las dos cosas o no queda ninguna. Un
 * registro de auditoría que puede faltar justo cuando algo salió mal no sirve
 * de mucho.
 */
export function operacionAuditoria(datos: DatosAuditoria) {
  return prisma.registroAuditoria.create({ data: aFila(datos) });
}

/**
 * Registra por su cuenta, sin transacción.
 *
 * Para cuando el cambio no es una sola operación de Prisma (o no lo es en
 * absoluto, como un inicio de sesión). Nunca lanza: auditar no puede ser el
 * motivo de que una operación legítima falle. Si falla, lo deja en la consola
 * del servidor, que en Vercel queda en los logs.
 */
export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  try {
    await prisma.registroAuditoria.create({ data: aFila(datos) });
  } catch (error) {
    console.error("[auditoria] no se pudo registrar:", datos.accion, datos.entidad, error);
  }
}
