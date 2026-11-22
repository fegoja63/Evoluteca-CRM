/**
 * Embudo de entrada: de las consultas que llegaron en los últimos
 * DIAS_EMBUDO días, cuántas se calificaron, llegaron a propuesta y se
 * vendieron. Es una cohorte: sigue a las que ENTRARON en la ventana hasta
 * donde llegaron hoy (no cuenta ventas de consultas viejas).
 *
 * - Consultas: oportunidades nuevas (sin contar renovaciones) + conversaciones
 *   del Chat web que no dejaron datos (no llegaron a ser oportunidad).
 * - Calificados / Propuestas / Ventas: la etapa MÁS AVANZADA a la que llegó
 *   cada oportunidad, según su historial de etapas. Una que pasó por Propuesta
 *   y luego se perdió sí cuenta como propuesta.
 *
 * Lo usan el Panel del Lunes (/api/reportes/lunes) y el correo del lunes. La
 * carga desde la base está en embudo-entrada-carga.ts (este archivo es puro y
 * lo importa también el panel en el navegador).
 */
export const DIAS_EMBUDO = 30;

const NIVEL: Record<string, number> = { PROSPECTO: 0, CALIFICADO: 1, PROPUESTA: 2, NEGOCIACION: 3, GANADA: 4 };

/** Etapa más avanzada alcanzada (0–4). PERDIDA y valores raros no suman. */
export function nivelAlcanzado(etapa: string, historial: string[]): number {
  return Math.max(0, ...[etapa, ...historial].map(e => NIVEL[e] ?? 0));
}

export type EmbudoEntrada = {
  consultas: number;
  calificados: number;
  propuestas: number;
  ventas: number;
  /** Del Chat web: conversaciones de la ventana y cuántas dejaron datos. */
  chat: { conversaciones: number; conDatos: number };
};

export function calcularEmbudo(
  oportunidades: { etapa: string; historial: string[] }[],
  conversaciones: { oportunidadId: string | null }[],
): EmbudoEntrada {
  const niveles = oportunidades.map(o => nivelAlcanzado(o.etapa, o.historial));
  const sinDatos = conversaciones.filter(c => !c.oportunidadId).length;
  return {
    consultas: oportunidades.length + sinDatos,
    calificados: niveles.filter(n => n >= NIVEL.CALIFICADO).length,
    propuestas: niveles.filter(n => n >= NIVEL.PROPUESTA).length,
    ventas: niveles.filter(n => n >= NIVEL.GANADA).length,
    chat: { conversaciones: conversaciones.length, conDatos: conversaciones.length - sinDatos },
  };
}

/** % de un paso sobre el anterior (null si el anterior es 0). */
export function tasaPaso(actual: number, anterior: number): number | null {
  return anterior > 0 ? Math.round((actual / anterior) * 100) : null;
}
