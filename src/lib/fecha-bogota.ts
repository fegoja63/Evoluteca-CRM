// Colombia (America/Bogota) usa UTC-5 todo el año (sin horario de verano).
// En producción el servidor corre en UTC, así que `new Date()` y sus componentes
// locales (getDate/getMonth...) caen en el día UTC: de noche en Bogotá eso ya es
// el día siguiente. Estos helpers fijan los cálculos de "hoy" a la fecha real de
// Bogotá para que el dashboard no se adelante un día por la tarde/noche.

const HORAS_OFFSET_BOGOTA = 5; // UTC-5, constante todo el año

/** Año, mes (0-index) y día del calendario actual en Bogotá. */
export function componentesHoyBogota(now: Date = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const val = (tipo: string) => Number(partes.find(p => p.type === tipo)!.value);
  return { anio: val("year"), mes: val("month") - 1, dia: val("day") };
}

/**
 * Instante UTC correspondiente a la medianoche de Bogotá de hoy más `deltaDias`.
 * Úsalo como límite para comparar contra timestamps guardados (que están en UTC),
 * p. ej. la ventana de actividades "de hoy": [medianocheBogota(0), medianocheBogota(1)).
 */
export function medianocheBogota(deltaDias = 0, now: Date = new Date()): Date {
  const { anio, mes, dia } = componentesHoyBogota(now);
  return new Date(Date.UTC(anio, mes, dia + deltaDias, HORAS_OFFSET_BOGOTA, 0, 0, 0));
}
