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
    if (!isNaN(d.getTime())) {
      // extras.MES es una etiqueta de calendario (año-mes) guardada como medianoche
      // UTC del día 1 del mes importado desde Excel. Leerla con getMonth()/getFullYear()
      // (hora local) la corre un mes atrás en timezones detrás de UTC — Colombia es
      // UTC-5, así que "2026-02-01T00:00:00Z" se interpreta como 31 de enero 7pm.
      // Se reconstruye en hora local a partir de los componentes UTC para fijarla
      // siempre al mes correcto, sin importar el timezone del servidor.
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
    }
  }
  return new Date(o.fechaCierre ?? o.fechaEvento ?? o.creadoEn);
}
