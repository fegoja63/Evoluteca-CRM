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

// ---------------------------------------------------------------------------
// Fechas escritas en formularios (datetime-local / date).
//
// Los <input type="datetime-local"> y <input type="date"> mandan una hora "de
// pared" SIN zona (ej. "2026-10-20T19:00"). Si el servidor la parsea con
// `new Date(...)`, la interpreta en la zona DEL SERVIDOR. En Vercel (UTC)
// "7:00 p.m." se guarda como 19:00Z y un usuario en Colombia (UTC-5) la ve como
// 2:00 p.m. — corrida 5 horas. En local no se nota porque el equipo ya está en
// Bogotá. No se puede fijar `TZ=America/Bogota` en Vercel (`TZ` es un nombre
// reservado por AWS Lambda), así que el arreglo va en el código: como Colombia
// es UTC-5 fijo todo el año, anclamos la hora del formulario a "-05:00".
// ---------------------------------------------------------------------------

export const OFFSET_BOGOTA = "-05:00";

// "2026-10-20T19:00" o "2026-10-20T19:00:30" (hora de pared, sin zona).
const RE_DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
// "2026-10-20" (solo fecha, sin hora).
const RE_FECHA_SOLA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Toma un valor de formulario y, si es una hora "de pared" sin zona, le agrega
 * el offset de Bogotá para que se interprete como hora colombiana. Cualquier
 * otra cosa (string con zona ya incluida, "", null, Date, número) se devuelve
 * tal cual. Pensado para usarse como `preprocess` de Zod antes de
 * `z.coerce.date()`.
 */
export function anclarBogota(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (RE_DATETIME_LOCAL.test(s)) {
    const conSegundos = s.length === 16 ? `${s}:00` : s;
    return `${conSegundos}${OFFSET_BOGOTA}`;
  }
  if (RE_FECHA_SOLA.test(s)) {
    return `${s}T00:00:00${OFFSET_BOGOTA}`;
  }
  return v;
}

/**
 * Igual que `anclarBogota` pero devuelve un `Date`. Para código que arma la
 * fecha a mano (no vía Zod), ej. la creación de temporadas.
 */
export function fechaDesdeBogota(s: string): Date {
  return new Date(anclarBogota(s) as string);
}

/**
 * Formatea un instante al valor que espera <input type="datetime-local">
 * ("YYYY-MM-DDTHH:mm") en hora local del navegador. Los usuarios están en
 * Bogotá, así que muestra la hora colombiana. Úsalo para precargar el input al
 * editar en vez de `toISOString().slice(0,16)`, que da la hora en UTC y corre
 * el reloj 5 horas.
 */
export function aInputDatetimeLocal(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
