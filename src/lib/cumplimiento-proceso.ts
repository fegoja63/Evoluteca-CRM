// Cumplimiento del proceso comercial por vendedor: mide si el equipo HACE lo que
// agendó, no solo cuánto vende. Tres señales, todas verificables en la Agenda:
//
//   - Cumplimiento 7 días: de las actividades agendadas en los últimos 7 días
//     (antes de hoy), cuántas se marcaron como hechas. OJO: la actividad no
//     guarda cuándo se completó, así que esto es "cumplidas", no "a tiempo".
//   - Tareas vencidas: pendientes con fecha anterior a hoy (cualquier antigüedad).
//   - Negocios sin próximo paso: oportunidades activas del vendedor sin ninguna
//     actividad pendiente de hoy en adelante.
//
// Puro y determinista (sin consultas): el API le pasa los datos ya filtrados.

export type ActividadCumplimiento = {
  fecha: Date;
  completada: boolean;
  responsableId: string | null;
  creadoBy: string | null;
};

export type OportunidadCumplimiento = {
  creadoBy: string | null;
  pendientesDesdeHoy: number; // actividades pendientes con fecha ≥ inicio de hoy
};

export type FilaCumplimiento = {
  id: string;
  nombre: string;
  agendadas7d: number;
  hechas7d: number;
  pct7d: number | null; // null si no tenía nada agendado
  vencidas: number;
  sinProximoPaso: number;
};

const SIN = "sin";

/**
 * @param inicioHoy  medianoche de Bogotá de hoy (límite entre "vencida" y "próxima")
 * @param hace7dias  inicio de la ventana de cumplimiento
 */
export function calcularCumplimiento(
  actividades: ActividadCumplimiento[],
  oportunidades: OportunidadCumplimiento[],
  nombres: Map<string, string>,
  inicioHoy: Date,
  hace7dias: Date,
): FilaCumplimiento[] {
  const filas = new Map<string, FilaCumplimiento>();
  const fila = (id: string | null) => {
    // Un id que no corresponde a un usuario actual (p. ej. un usuario eliminado)
    // se agrupa en una sola fila "Sin asignar", en vez de una fila por id.
    const key = id && nombres.has(id) ? id : SIN;
    let f = filas.get(key);
    if (!f) {
      f = { id: key, nombre: nombres.get(key) ?? "Sin asignar",
        agendadas7d: 0, hechas7d: 0, pct7d: null, vencidas: 0, sinProximoPaso: 0 };
      filas.set(key, f);
    }
    return f;
  };

  for (const a of actividades) {
    if (a.fecha >= inicioHoy) continue; // lo de hoy en adelante aún no se evalúa
    const f = fila(a.responsableId ?? a.creadoBy);
    if (!a.completada) f.vencidas++;
    if (a.fecha >= hace7dias) {
      f.agendadas7d++;
      if (a.completada) f.hechas7d++;
    }
  }

  for (const o of oportunidades) {
    if (o.pendientesDesdeHoy === 0) fila(o.creadoBy).sinProximoPaso++;
  }

  return Array.from(filas.values())
    .map((f) => ({ ...f, pct7d: f.agendadas7d > 0 ? Math.round((f.hechas7d / f.agendadas7d) * 100) : null }))
    // Primero quien más necesita atención: más vencidas, luego más negocios sin paso.
    .sort((a, b) => b.vencidas - a.vencidas || b.sinProximoPaso - a.sinProximoPaso || a.nombre.localeCompare(b.nombre));
}
