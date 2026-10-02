type OportunidadConFechas = {
  fechaCierre?: Date | null;
  fechaEvento?: Date | null;
  creadoEn: Date;
  extras?: unknown;
};

const MS_HORA = 3_600_000;
const HORAS_OFFSET_BOGOTA = 5; // Colombia es UTC-5 todo el año (sin horario de verano)

/**
 * Día del calendario EN COLOMBIA de una fecha guardada, sin depender de la
 * zona horaria del proceso (UTC en Vercel, Bogotá en local, la del navegador
 * en el cliente).
 *
 * Dos tipos de valores conviven en la base:
 *  - Instantes reales (creadoEn, la fechaCierre que se pone al ganar, fechas de
 *    formulario ya ancladas a -05:00): se leen en hora de Bogotá.
 *  - "Solo día" guardados a medianoche UTC exacta (fechas de Excel, extras.MES,
 *    fechas de formulario anteriores al anclaje a Bogotá): son una etiqueta de
 *    calendario, se leen con sus componentes UTC. Leídos en Bogotá caerían en
 *    el día —y a veces el mes o el año— anterior.
 *
 * Un instante real que caiga justo en 00:00:00.000 UTC es prácticamente
 * imposible (los timestamps llevan milisegundos), así que la regla es segura.
 */
export function diaColombia(d: Date): { anio: number; mes: number; dia: number } {
  const esEtiquetaDeDia =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  const ref = esEtiquetaDeDia ? d : new Date(d.getTime() - HORAS_OFFSET_BOGOTA * MS_HORA);
  return { anio: ref.getUTCFullYear(), mes: ref.getUTCMonth(), dia: ref.getUTCDate() };
}

/**
 * Fecha real de un negocio para agruparlo por mes/año, en orden de confianza:
 * extras.MES (fecha preservada del Excel importado, la más confiable para negocios
 * antiguos que casi nunca traen fechaCierre) -> fechaCierre -> fechaEvento -> creadoEn.
 *
 * Devuelve el MEDIODÍA UTC de ese día del calendario colombiano. Así
 * getFullYear()/getMonth()/getDate() dan el día correcto en cualquier zona
 * entre UTC-11 y UTC+11 (servidor en UTC, local en Bogotá, navegador), y la
 * fecha cae dentro de cualquier ventana de mes, ya esté construida con la
 * medianoche del servidor o con la de Bogotá (05:00 UTC). Antes devolvía la
 * medianoche local del proceso: en Vercel (UTC) quedaba 5 h antes de las
 * ventanas ancladas a Bogotá y el negocio se contaba en el mes anterior.
 *
 * Usar SIEMPRE esta función para agrupar oportunidades por mes/año — Dashboard,
 * Reportes y los correos deben calcular el mismo número para el mismo negocio.
 */
export function fechaEfectiva(o: OportunidadConFechas): Date {
  const ext = o.extras as Record<string, string> | null | undefined;
  if (ext?.["MES"]) {
    const d = new Date(ext["MES"]);
    if (!isNaN(d.getTime())) {
      // extras.MES es una etiqueta de calendario (año-mes) del Excel importado,
      // guardada como el día 1 a medianoche UTC: se toman sus componentes UTC.
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 12));
    }
  }
  const { anio, mes, dia } = diaColombia(new Date(o.fechaCierre ?? o.fechaEvento ?? o.creadoEn));
  return new Date(Date.UTC(anio, mes, dia, 12));
}
