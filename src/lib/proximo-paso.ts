import { inicioProximoPaso } from "./estado-comercial";

/**
 * "Próximo paso" visible en la tarjeta del Pipeline.
 *
 * Mismo criterio que estado-comercial: el próximo paso es la primera actividad
 * NO completada desde el inicio de hoy (hora Bogotá). Si no hay ninguna pero
 * quedó una pendiente de días anteriores, se muestra esa como vencida.
 */

export type ActividadPendiente = { fecha: Date; tipo: string; titulo: string };
export type ProximoPaso = ActividadPendiente & { vencida: boolean };

/** `pendientes`: actividades NO completadas de UNA oportunidad, en cualquier orden. */
export function elegirProximoPaso(pendientes: ActividadPendiente[], ahora: Date = new Date()): ProximoPaso | null {
  if (pendientes.length === 0) return null;
  const inicio = inicioProximoPaso(ahora).getTime();
  const ordenadas = [...pendientes].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const proxima = ordenadas.find(a => a.fecha.getTime() >= inicio);
  if (proxima) return { ...proxima, vencida: false };
  // Todas son de días anteriores: la más reciente es la que quedó pendiente.
  return { ...ordenadas[ordenadas.length - 1], vencida: true };
}

const TZ = "America/Bogota";

/** Día calendario en Bogotá como número de días desde 1970 (para restar fechas). */
function diaBogota(fecha: Date): number {
  const [a, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(fecha).split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 86_400_000;
}

/** Texto corto para el chip: "Hoy 3:00 p. m.", "Mañana", "jue", "12 oct", "Vencida hace 3 d". */
export function etiquetaProximoPaso(paso: { fecha: Date; vencida: boolean }, ahora: Date = new Date()): string {
  const dias = diaBogota(paso.fecha) - diaBogota(ahora);
  if (paso.vencida) return `Vencida hace ${Math.max(1, -dias)} d`;
  if (dias <= 0) {
    const hora = new Intl.DateTimeFormat("es-CO", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(paso.fecha);
    return `Hoy ${hora}`;
  }
  if (dias === 1) return "Mañana";
  if (dias < 7) return new Intl.DateTimeFormat("es-CO", { timeZone: TZ, weekday: "short" }).format(paso.fecha).replace(".", "");
  return new Intl.DateTimeFormat("es-CO", { timeZone: TZ, day: "numeric", month: "short" }).format(paso.fecha).replace(" de ", " ").replace(".", "");
}
