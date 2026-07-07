type OportunidadConFechas = {
  fechaCierre?: Date | null;
  fechaEvento?: Date | null;
  creadoEn: Date;
  extras?: unknown;
};

/**
 * Fecha real de un negocio para agruparlo por mes/año, en orden de confianza:
 * extras.MES (fecha preservada del Excel importado, la más confiable para negocios
 * antiguos que casi nunca traen fechaCierre) -> fechaCierre -> fechaEvento -> creadoEn.
 *
 * Usar SIEMPRE esta función para agrupar oportunidades por mes/año — Dashboard y
 * Reportes deben calcular el mismo número para el mismo negocio.
 */
export function fechaEfectiva(o: OportunidadConFechas): Date {
  const ext = o.extras as Record<string, string> | null | undefined;
  if (ext?.["MES"]) {
    const d = new Date(ext["MES"]);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(o.fechaCierre ?? o.fechaEvento ?? o.creadoEn);
}
