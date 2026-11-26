// Reunión semanal: indicadores de actividad que anticipan la venta, por
// vendedor y por semana, con la meta estándar y el compromiso de la semana.
//
// "Voy a vender más" es una intención; "esta semana traigo 30 contactos nuevos"
// es un compromiso que se puede medir. El CRM cuenta solo lo que pasó con lo
// que ya se registra (contactos, negocios, actividades y cotizaciones), así que
// nadie llena un reporte aparte.
//
// La semana va de lunes a domingo en Bogotá y se identifica por la fecha de su
// lunes ("YYYY-MM-DD"). Este módulo es puro (sin base de datos); la carga de lo
// real está en actividad-semanal-carga.ts.

export const INDICADORES = [
  { clave: "contactos", etiqueta: "Contactos nuevos", corta: "Contactos",
    ayuda: "Contactos que creó a mano. No cuentan los que llegan solos (chat web, formulario, enlace para agendar) ni los importados." },
  { clave: "negocios", etiqueta: "Negocios nuevos", corta: "Negocios",
    ayuda: "Oportunidades que creó en la semana." },
  { clave: "llamadas", etiqueta: "Llamadas", corta: "Llamadas",
    ayuda: "Llamadas de la semana marcadas como hechas." },
  { clave: "reuniones", etiqueta: "Reuniones y visitas", corta: "Reuniones",
    ayuda: "Reuniones y visitas de la semana marcadas como hechas." },
  { clave: "propuestas", etiqueta: "Propuestas enviadas", corta: "Propuestas",
    ayuda: "Cotizaciones creadas en la semana que ya no están en borrador." },
] as const;

export type ClaveIndicador = (typeof INDICADORES)[number]["clave"];
export type Conteo = Record<ClaveIndicador, number>;

export const CLAVES: ClaveIndicador[] = INDICADORES.map(i => i.clave);

export function conteoVacio(): Conteo {
  return { contactos: 0, negocios: 0, llamadas: 0, reuniones: 0, propuestas: 0 };
}

/** Toma solo los cinco indicadores de un registro (meta o compromiso de la base). */
export function aConteo(r: Partial<Record<ClaveIndicador, number | null>> | null | undefined): Conteo {
  const c = conteoVacio();
  if (!r) return c;
  for (const k of CLAVES) c[k] = Math.max(0, Math.round(Number(r[k] ?? 0)) || 0);
  return c;
}

export function tieneAlgo(c: Conteo | null | undefined): boolean {
  return !!c && CLAVES.some(k => c[k] > 0);
}

const HORAS_OFFSET_BOGOTA = 5;
const DIA_MS = 86_400_000;
const RE_SEMANA = /^(\d{4})-(\d{2})-(\d{2})$/;

function aTexto(anio: number, mes0: number, dia: number): string {
  const d = new Date(Date.UTC(anio, mes0, dia));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Lunes (Bogotá) de la semana en la que cae un instante, como "YYYY-MM-DD". */
export function lunesDe(instante: Date = new Date()): string {
  const local = new Date(instante.getTime() - HORAS_OFFSET_BOGOTA * 3_600_000);
  const atras = (local.getUTCDay() + 6) % 7; // lunes = 0 … domingo = 6
  return aTexto(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - atras);
}

/** ¿Es una semana bien escrita y su fecha cae en lunes? */
export function semanaValida(semana: unknown): semana is string {
  if (typeof semana !== "string") return false;
  const m = RE_SEMANA.exec(semana);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return aTexto(+m[1], +m[2] - 1, +m[3]) === semana && d.getUTCDay() === 1;
}

/** La semana que está `n` semanas después (o antes, si es negativo). */
export function moverSemana(semana: string, n: number): string {
  const m = RE_SEMANA.exec(semana)!;
  return aTexto(+m[1], +m[2] - 1, +m[3] + 7 * n);
}

/** Instantes UTC [desde, hasta) de la semana: lunes 00:00 a lunes siguiente 00:00 de Bogotá. */
export function rangoSemana(semana: string): { desde: Date; hasta: Date } {
  const m = RE_SEMANA.exec(semana)!;
  const desde = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], HORAS_OFFSET_BOGOTA));
  return { desde, hasta: new Date(desde.getTime() + 7 * DIA_MS) };
}

/** "23 nov – 29 nov" para mostrar junto a la semana. */
export function textoSemana(semana: string): string {
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const m = RE_SEMANA.exec(semana)!;
  const ini = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const fin = new Date(ini.getTime() + 6 * DIA_MS);
  const f = (d: Date) => `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
  return `${f(ini)} – ${f(fin)}`;
}

export type ResultadoIndicador = { clave: ClaveIndicador; prometido: number; real: number; cumplido: boolean };
export type Cumplimiento = {
  indicadores: ResultadoIndicador[]; // solo los que tenían compromiso (> 0)
  cumplidos: number;
  total: number;
  /** Promedio de avance (cada indicador topado en 100 %); null si no hubo compromiso. */
  pct: number | null;
};

/** Lo prometido frente a lo hecho. Solo cuentan los indicadores con compromiso. */
export function cumplimiento(prometido: Conteo, real: Conteo): Cumplimiento {
  const indicadores = CLAVES.filter(k => prometido[k] > 0)
    .map(k => ({ clave: k, prometido: prometido[k], real: real[k], cumplido: real[k] >= prometido[k] }));
  const total = indicadores.length;
  const cumplidos = indicadores.filter(i => i.cumplido).length;
  const pct = total
    ? Math.round((indicadores.reduce((a, i) => a + Math.min(1, i.real / i.prometido), 0) / total) * 100)
    : null;
  return { indicadores, cumplidos, total, pct };
}

/** Etiqueta corta de un indicador. */
export function etiquetaDe(clave: ClaveIndicador, corta = false): string {
  const i = INDICADORES.find(x => x.clave === clave)!;
  return corta ? i.corta : i.etiqueta;
}
