/**
 * Simulador de la caja proyectada: "¿qué pasa si…?". Toma los mismos datos de
 * la proyección y les aplica un escenario. Puro, para usarlo en el navegador
 * (los controles recalculan al instante) y probarlo sin base de datos.
 */
import { proyectarCaja, claveNegocio, type NegocioPipeline, type Proyeccion, type Supuestos } from "./caja";

export type Escenario = {
  /** % de lo que dice el CRM que se cumple del pipeline (100 = tal cual). */
  cumplimientoPipeline: number;
  /** Días adicionales que tardan los clientes en pagar. */
  retrasoCobros: number;
  /** Variación de la nómina, en % (+10 = sube 10 %). */
  variacionNomina: number;
  /** Personas nuevas en nómina y lo que cuesta cada una al mes (salario + carga). */
  personasNuevas: number;
  costoPersona: number;
  /** Variación de gastos fijos y pagos a proveedores, en %. */
  variacionGastos: number;
  /** Variación de las ventas de contado, en %. */
  variacionContado: number;
  /** Negocios que se suponen cerrados al 100 % en su fecha (claveNegocio). */
  forzados: string[];
};

/** Costo mensual por persona de partida (salario + prestaciones y seguridad social). */
export const COSTO_PERSONA_DEFECTO = 4_500_000;

export const ESCENARIO_BASE: Escenario = {
  cumplimientoPipeline: 100, retrasoCobros: 0, variacionNomina: 0, personasNuevas: 0,
  costoPersona: COSTO_PERSONA_DEFECTO, variacionGastos: 0, variacionContado: 0, forzados: [],
};

export function esBase(e: Escenario): boolean {
  return e.cumplimientoPipeline === 100 && e.retrasoCobros === 0 && e.variacionNomina === 0 && e.personasNuevas === 0
    && e.variacionGastos === 0 && e.variacionContado === 0 && e.forzados.length === 0;
}

const por = (v: number, pct: number) => v * (1 + pct / 100);

/** Supuestos y pipeline con el escenario aplicado. */
export function aplicarEscenario(
  supuestos: Supuestos,
  pipeline: NegocioPipeline[],
  e: Escenario,
): { supuestos: Supuestos; pipeline: NegocioPipeline[] } {
  const forzados = new Set(e.forzados);
  return {
    supuestos: {
      ...supuestos,
      nominaMensual: por(supuestos.nominaMensual, e.variacionNomina) + e.personasNuevas * e.costoPersona,
      gastosFijosMensuales: por(supuestos.gastosFijosMensuales, e.variacionGastos),
      proveedoresSemanales: por(supuestos.proveedoresSemanales, e.variacionGastos),
      ventasContadoSemanales: por(supuestos.ventasContadoSemanales, e.variacionContado),
      diasCobro: supuestos.diasCobro + e.retrasoCobros,
    },
    // Un negocio forzado cierra al 100 %; los demás escalan su probabilidad, sin pasar de 100 %.
    pipeline: pipeline.map(n => ({
      ...n,
      probabilidad: forzados.has(claveNegocio(n)) ? 100 : Math.min(100, ((n.probabilidad ?? 50) * e.cumplimientoPipeline) / 100),
    })),
  };
}

type BaseProyeccion = { hoy: string; saldoInicial: number; cartera: number; supuestos: Supuestos; pipeline: NegocioPipeline[] };

export type Rescate = {
  /** Los negocios que conviene cerrar primero, en orden. */
  negocios: NegocioPipeline[];
  /** true = cerrarlos en su fecha evita que la caja quede en rojo. */
  resuelve: boolean;
  /** Punto más bajo si se cierran. */
  minimo: Proyeccion["minimo"];
};

/**
 * Si la caja queda en rojo, busca hasta 3 negocios del pipeline que, cerrados
 * al 100 % en su fecha, más la mejoran: cada vuelta prueba todos y se queda
 * con el que más sube el punto más bajo. null si no hay rojo o no hay pipeline.
 */
export function rescateDeCaja(base: BaseProyeccion, escenario: Escenario = ESCENARIO_BASE): Rescate | null {
  const proyectar = (forzados: string[]) =>
    proyectarCaja({ ...base, ...aplicarEscenario(base.supuestos, base.pipeline, { ...escenario, forzados }) });
  let actual = proyectar(escenario.forzados);
  if (!actual.primerDiaEnRojo || base.pipeline.length === 0) return null;

  const elegidos: string[] = [...escenario.forzados];
  const negocios: NegocioPipeline[] = [];
  for (let i = 0; i < 3 && actual.primerDiaEnRojo; i++) {
    let mejor: { n: NegocioPipeline; p: Proyeccion } | null = null;
    for (const n of base.pipeline) {
      if (elegidos.includes(claveNegocio(n))) continue;
      const p = proyectar([...elegidos, claveNegocio(n)]);
      if (!mejor || p.minimo.saldo > mejor.p.minimo.saldo) mejor = { n, p };
    }
    // Sin mejora real (el negocio entra después del hueco), no se sigue.
    if (!mejor || mejor.p.minimo.saldo <= actual.minimo.saldo + 1) break;
    elegidos.push(claveNegocio(mejor.n));
    negocios.push(mejor.n);
    actual = mejor.p;
  }
  if (negocios.length === 0) return null;
  return { negocios, resuelve: !actual.primerDiaEnRojo, minimo: actual.minimo };
}
