/**
 * Análisis MENSUAL o ANUAL del Gerente Financiero.
 *
 * - Mensual: la empresa cargó su estado de resultados mes a mes. Se compara
 *   mes contra mes y contra el mismo mes del año pasado, se ve la temporada y
 *   se proyectan los próximos meses.
 * - Anual: lo más reciente es un cierre de año (lo que suelen entregar los
 *   contadores: el año contra el anterior). Se compara año contra año con la
 *   utilidad real (partidas no operacionales e impuesto del contador). No hay
 *   detalle mes a mes: la caja y el punto de equilibrio usan promedios (año ÷ 12)
 *   y no hay temporada ni proyección por meses.
 *
 * Funciones puras (sin base de datos).
 */
import type { Periodo } from "./estados";

export type ModoAnalisis = "mensual" | "anual";

/** Anual si hay cierres anuales y ningún mes cargado es posterior al último cierre. */
export function modoAnalisis(periodos: Periodo[], cierres: Periodo[]): ModoAnalisis {
  const ultimo = cierres[cierres.length - 1];
  if (!ultimo) return "mensual";
  const finCierre = `${ultimo.mes}-12`;
  return periodos.some(p => p.mes > finCierre) ? "mensual" : "anual";
}

/** El cierre anual repartido en 12 meses iguales (promedios), para la caja. */
export function mesesDelCierre(c: Periodo | undefined): Periodo[] {
  if (!c) return [];
  return Array.from({ length: 12 }, (_, i) => ({
    mes: `${c.mes}-${String(i + 1).padStart(2, "0")}`,
    ventas: c.ventas / 12, costoVentas: c.costoVentas / 12, gastosAdmin: c.gastosAdmin / 12,
    gastosVentas: c.gastosVentas / 12, depreciacion: c.depreciacion / 12, intereses: c.intereses / 12,
    otrosIngresos: (c.otrosIngresos ?? 0) / 12, otrosGastos: (c.otrosGastos ?? 0) / 12,
    impuestoRenta: c.impuestoRenta != null ? c.impuestoRenta / 12 : null,
  }));
}

/** Meses completos entre el final de un periodo ("YYYY" o "YYYY-MM") y hoy ("YYYY-MM-DD"). */
export function mesesDesde(periodo: string, hoy: string): number {
  const fin = periodo.length === 4 ? `${periodo}-12` : periodo;
  const [a1, m1] = fin.split("-").map(Number);
  const [a2, m2] = hoy.slice(0, 7).split("-").map(Number);
  return Math.max(0, (a2 - a1) * 12 + (m2 - m1));
}

/** La aclaración que ven los usuarios sobre la diferencia entre los dos análisis. */
export const ACLARACION_MODO: Record<ModoAnalisis, string> = {
  anual: "Análisis con cierre anual: los resultados son del año completo y se comparan con el año anterior, con la utilidad que reportó el contador (ingresos y gastos no operacionales e impuesto de renta real). No hay detalle mes a mes: la caja proyectada y el punto de equilibrio usan promedios (año ÷ 12) y no se ven temporadas ni proyecciones por mes. Para eso, cargue los estados mensuales.",
  mensual: "Análisis con estados mensuales: compara cada mes con el anterior y con el mismo mes del año pasado, muestra la temporada y proyecta los próximos meses. Si el contador no reporta el impuesto de renta de cada mes, se estima al 35 %, así que la utilidad puede diferir de la del cierre anual auditado. Si también cargó el cierre anual, se muestra como referencia.",
};
