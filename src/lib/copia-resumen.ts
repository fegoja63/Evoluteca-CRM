/**
 * Copia de los correos resumen (lunes y mensual) para Evoluteca.
 *
 * El administrador del demo tiene un correo inventado y su tenant los correos
 * apagados, pero sus resúmenes son los que tienen datos completos. Evoluteca
 * recibe esos resúmenes para ver el correo tal como lo ve un cliente.
 *
 * La dirección de destino vive en la variable RESUMEN_COPIA_A (no en el
 * código). Sin ella no se envía ninguna copia.
 */
export const USUARIO_COPIA = "admin@demo-evoluteca.com";

/** Dirección a la que va el resumen de este usuario en lugar de la suya, o null. */
export function destinoCopia(email: string | null | undefined): string | null {
  if (email !== USUARIO_COPIA) return null;
  return process.env.RESUMEN_COPIA_A?.trim() || null;
}

export const PREFIJO_COPIA = "[Copia demo] ";
