/**
 * Filtro Prisma por período de creación (campo `creadoEn`). Devuelve `{}` cuando
 * el año no es válido, para poder esparcirlo (`...`) sin condiciones dentro de un
 * `where` existente.
 *
 * - Solo año → rango [1-ene-AÑO, 1-ene-AÑO+1).
 * - Año + mes (01–12) → rango [1-MES-AÑO, 1-(MES+1)-AÑO).
 *
 * Los límites son en UTC. El mes se ignora si no viene un año válido. Se comparte
 * entre la lista de clientes, sus KPIs y la exportación para que el filtro
 * "clientes nuevos por año/mes" sea consistente en las tres.
 */
export function filtroPeriodoCreacion(anio?: string | null, mes?: string | null) {
  if (!anio || !/^\d{4}$/.test(anio)) return {};
  const y = Number(anio);
  const m = mes && /^(0?[1-9]|1[0-2])$/.test(mes) ? Number(mes) : null;
  if (m) {
    // Date.UTC maneja el desborde: mes 12 → 1-ene del año siguiente.
    return { creadoEn: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) } };
  }
  return { creadoEn: { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) } };
}
