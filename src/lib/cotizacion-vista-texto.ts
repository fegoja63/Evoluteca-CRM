/**
 * Texto de "el cliente abrió la cotización" para las pantallas (sin dependencias
 * de servidor, para poder usarse en componentes de cliente).
 */
import { formatoFechaHora } from "@/lib/fecha-bogota";

type ConVistas = {
  estado: string; creadoEn?: string | Date | null; tokenPublico?: string | null;
  vistas?: number | null; vistaUltimaEn?: string | Date | null;
};

// Las aperturas se registran desde este día (Bogotá). Una cotización anterior
// pudo abrirse antes, sin quedar registrada: a esas no se les dice "Sin abrir".
export const SEGUIMIENTO_VISTAS_DESDE = new Date("2026-11-12T05:00:00Z");

export type InsigniaVista = { texto: string; detalle: string; vista: boolean; ultima?: string } | null;

/**
 * "Vista 3×" con la fecha de la última apertura, o "Sin abrir" si se envió y el
 * cliente aún no la abre. null cuando no aplica (sin enlace, o borrador sin vistas).
 */
export function insigniaVista(c: ConVistas): InsigniaVista {
  const vistas = c.vistas ?? 0;
  if (vistas > 0 && c.vistaUltimaEn) {
    const ultima = formatoFechaHora(new Date(c.vistaUltimaEn), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return {
      texto: vistas === 1 ? "Vista" : `Vista ${vistas}×`,
      detalle: `El cliente la abrió ${vistas === 1 ? "1 vez" : `${vistas} veces`} · última: ${ultima}`,
      vista: true,
      ultima,
    };
  }
  const conSeguimiento = c.creadoEn ? new Date(c.creadoEn) >= SEGUIMIENTO_VISTAS_DESDE : false;
  if (c.estado === "ENVIADA" && c.tokenPublico && conSeguimiento) {
    return { texto: "Sin abrir", detalle: "El cliente aún no ha abierto el enlace de la cotización", vista: false };
  }
  return null;
}
