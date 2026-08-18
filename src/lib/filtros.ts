/**
 * Filtro Prisma por año de creación (campo `creadoEn`). Devuelve `{}` cuando el
 * año no es válido, para poder esparcirlo (`...`) sin condiciones dentro de un
 * `where` existente. Usa límites en UTC: [1-ene-AÑO, 1-ene-AÑO+1).
 *
 * Se comparte entre la lista de clientes, sus KPIs y la exportación para que el
 * filtro "clientes nuevos del año" sea consistente en las tres.
 */
export function filtroAnioCreacion(anio: string | null | undefined) {
  if (!anio || !/^\d{4}$/.test(anio)) return {};
  const y = Number(anio);
  return {
    creadoEn: {
      gte: new Date(Date.UTC(y, 0, 1)),
      lt: new Date(Date.UTC(y + 1, 0, 1)),
    },
  };
}
