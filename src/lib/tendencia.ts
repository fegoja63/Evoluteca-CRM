/**
 * Comparación "mes en curso vs mes anterior al mismo corte".
 *
 * Comparar el mes en curso (a medio camino) contra el mes anterior completo
 * siempre daría una caída falsa; por eso el mes anterior se corta en el mismo
 * día: del 1 al `dia` de cada mes.
 */

/** Variación porcentual redondeada; null si no hay base para comparar. */
export function variacionPct(actual: number, anterior: number): number | null {
  if (!(anterior > 0)) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/**
 * Rango [inicio, fin) del mes anterior hasta el mismo día del mes. Si el mes
 * anterior es más corto (31 de marzo → febrero), el corte es su último día.
 * `mes` es 0-11, como en Date. Mismas fechas "locales" que usa el Dashboard.
 */
export function rangoMesAnteriorAlCorte(anio: number, mes: number, dia: number): { inicio: Date; fin: Date } {
  const inicio = new Date(anio, mes - 1, 1);
  const inicioMesActual = new Date(anio, mes, 1);
  const corte = new Date(anio, mes - 1, dia + 1);
  return { inicio, fin: corte < inicioMesActual ? corte : inicioMesActual };
}

/** Rangos [inicio, fin) de los últimos `n` meses, del más antiguo al actual. */
export function ultimosMeses(anio: number, mes: number, n: number): { inicio: Date; fin: Date }[] {
  return Array.from({ length: n }, (_, i) => {
    const m = mes - (n - 1) + i;
    return { inicio: new Date(anio, m, 1), fin: new Date(anio, m + 1, 1) };
  });
}
