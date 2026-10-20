/**
 * Simulador de la caja proyectada: "¿qué pasa si…?". Toma los mismos datos de
 * la proyección y les aplica un escenario. Puro, para usarlo en el navegador
 * (los controles recalculan al instante) y probarlo sin base de datos.
 */
import type { NegocioPipeline, Supuestos } from "./caja";

export type Escenario = {
  /** % de lo que dice el CRM que se cumple del pipeline (100 = tal cual). */
  cumplimientoPipeline: number;
  /** Días adicionales que tardan los clientes en pagar. */
  retrasoCobros: number;
  /** Variación de la nómina, en % (+10 = sube 10 %). */
  variacionNomina: number;
  /** Variación de gastos fijos y pagos a proveedores, en %. */
  variacionGastos: number;
  /** Variación de las ventas de contado, en %. */
  variacionContado: number;
};

export const ESCENARIO_BASE: Escenario = {
  cumplimientoPipeline: 100, retrasoCobros: 0, variacionNomina: 0, variacionGastos: 0, variacionContado: 0,
};

export function esBase(e: Escenario): boolean {
  return (Object.keys(ESCENARIO_BASE) as (keyof Escenario)[]).every(k => e[k] === ESCENARIO_BASE[k]);
}

const por = (v: number, pct: number) => v * (1 + pct / 100);

/** Supuestos y pipeline con el escenario aplicado. */
export function aplicarEscenario(
  supuestos: Supuestos,
  pipeline: NegocioPipeline[],
  e: Escenario,
): { supuestos: Supuestos; pipeline: NegocioPipeline[] } {
  return {
    supuestos: {
      ...supuestos,
      nominaMensual: por(supuestos.nominaMensual, e.variacionNomina),
      gastosFijosMensuales: por(supuestos.gastosFijosMensuales, e.variacionGastos),
      proveedoresSemanales: por(supuestos.proveedoresSemanales, e.variacionGastos),
      ventasContadoSemanales: por(supuestos.ventasContadoSemanales, e.variacionContado),
      diasCobro: supuestos.diasCobro + e.retrasoCobros,
    },
    // La probabilidad de cada negocio se escala, sin pasar de 100 %.
    pipeline: pipeline.map(n => ({
      ...n,
      probabilidad: Math.min(100, ((n.probabilidad ?? 50) * e.cumplimientoPipeline) / 100),
    })),
  };
}
