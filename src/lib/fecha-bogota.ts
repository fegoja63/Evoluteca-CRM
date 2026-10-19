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

// ---------------------------------------------------------------------------
// ÚNICO lugar donde se convierten fechas a texto o a valores de formulario.
//
// El error de las "5 horas corridas" volvía cada vez que una pantalla armaba su
// propia conversión: `toISOString()` da UTC, `toLocaleDateString()` usa la zona
// del servidor (UTC en Vercel) o la del navegador, y cada archivo improvisaba.
// Todo lo de abajo es explícito en hora de Bogotá, funciona igual en el servidor
// y en el navegador, y un test (fecha-bogota-guardian.test.ts) impide volver a
// escribir conversiones a mano fuera de este archivo.
//
// Dos familias, que NO se mezclan:
//  - INSTANTES (actividades, funciones, creación, "ahora"): siempre en hora de
//    Bogotá → formatoFecha, formatoFechaHora, formatoHora, fechaISO, aInputFecha.
//  - FECHAS DE CALENDARIO (fechaCierre, fechaEvento, fechaValidez, campos tipo
//    fecha): las cargas viejas, importaciones y `new Date("YYYY-MM-DD")` las
//    guardaron a la medianoche UTC exacta; las nuevas llegan ancladas a Bogotá
//    (05:00Z). → formatoDia, diaISO, aInputDia: una medianoche UTC exacta se lee
//    como ese día (en Bogotá caería el día anterior); lo demás, en hora Bogotá.
//    NO usar esta regla para instantes: las 7:00 p. m. de Bogotá SON la
//    medianoche UTC, y una función a esa hora saldría al día siguiente.
// ---------------------------------------------------------------------------

export const ZONA_BOGOTA = "America/Bogota";

type FechaEntrada = Date | string | number;
const aDate = (f: FechaEntrada) => (f instanceof Date ? f : new Date(f));

/** ¿Es una fecha de calendario guardada sin hora (medianoche UTC exacta)? */
function esMedianocheUTC(d: Date): boolean {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}
const zonaDia = (d: Date) => (esMedianocheUTC(d) ? "UTC" : ZONA_BOGOTA);
const SOLO_FECHA: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
const isoEn = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// ── Instantes ──────────────────────────────────────────────────────────────

/** Fecha (sin hora) de un instante, en hora de Bogotá: "20/10/2026" o con opciones. */
export function formatoFecha(fecha: FechaEntrada, opciones: Intl.DateTimeFormatOptions = SOLO_FECHA): string {
  return aDate(fecha).toLocaleDateString("es-CO", { ...opciones, timeZone: ZONA_BOGOTA });
}

/** Fecha y hora de un instante (actividad, creación, "ahora"), siempre en hora de Bogotá. */
export function formatoFechaHora(
  fecha: FechaEntrada,
  opciones: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" },
): string {
  return aDate(fecha).toLocaleString("es-CO", { ...opciones, timeZone: ZONA_BOGOTA });
}

/** Solo la hora de un instante, en hora de Bogotá ("9:00 a. m."). */
export function formatoHora(
  fecha: FechaEntrada,
  opciones: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
  return aDate(fecha).toLocaleTimeString("es-CO", { ...opciones, timeZone: ZONA_BOGOTA });
}

/** "YYYY-MM-DD" de un instante en Bogotá (por defecto, HOY). Nombres de archivo, `max` de un date. */
export function fechaISO(fecha: FechaEntrada = new Date()): string {
  return isoEn(aDate(fecha), ZONA_BOGOTA);
}

/** <input type="date"> a partir de un instante ("" si no hay). */
export function aInputFecha(fecha: FechaEntrada | null | undefined): string {
  return fecha == null || fecha === "" ? "" : fechaISO(fecha);
}

// ── Fechas de calendario (cierre, evento, validez, campos tipo fecha) ──────

/** Muestra una fecha de calendario: "20/10/2026" (o con opciones). Ver la regla arriba. */
export function formatoDia(fecha: FechaEntrada, opciones: Intl.DateTimeFormatOptions = SOLO_FECHA): string {
  const d = aDate(fecha);
  return d.toLocaleDateString("es-CO", { ...opciones, timeZone: zonaDia(d) });
}

/** "YYYY-MM-DD" de una fecha de calendario. */
export function diaISO(fecha: FechaEntrada): string {
  const d = aDate(fecha);
  return isoEn(d, zonaDia(d));
}

/** <input type="date"> a partir de una fecha de calendario guardada ("" si no hay). */
export function aInputDia(fecha: FechaEntrada | null | undefined): string {
  return fecha == null || fecha === "" ? "" : diaISO(fecha);
}

// ── Formularios con hora ───────────────────────────────────────────────────

/**
 * Valor para <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") en hora de
 * Bogotá. En vez de `toISOString().slice(0,16)`, que da la hora en UTC y corre
 * el reloj 5 horas. La API lo vuelve a anclar con `anclarBogota`.
 */
export function aInputDatetimeLocal(fecha: FechaEntrada): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_BOGOTA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(aDate(fecha)).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Valor por defecto de un datetime-local: la próxima hora en punto, en hora de Bogotá. */
export function ahoraParaInput(ahora: Date = new Date()): string {
  const HORA = 3_600_000; // Bogotá está a horas enteras de UTC: redondear en UTC sirve
  return aInputDatetimeLocal(new Date((Math.floor(ahora.getTime() / HORA) + 1) * HORA));
}

/** Hora del día (0-23) en Bogotá, p. ej. para el saludo "Buenos días / tardes / noches". */
export function horaBogota(ahora: Date = new Date()): number {
  return Number(aInputDatetimeLocal(ahora).slice(11, 13));
}
