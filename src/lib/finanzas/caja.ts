/**
 * Caja proyectada del Gerente Financiero (Fase 2): saldo día a día de las
 * próximas 13 semanas, días de caja y punto de equilibrio. Funciones puras:
 * las fechas son días de calendario "YYYY-MM-DD" (sin hora, sin zona), para
 * que el resultado no dependa del servidor.
 *
 * Es una proyección con supuestos, no contabilidad: la pantalla lo dice y
 * muestra de dónde sale cada cifra.
 */
import type { Periodo } from "./estados";
import { ultimosMeses } from "./estados";

export const SEMANAS = 13;

/** Lo que el cliente nos dice de su operación (montos en pesos). */
export type Supuestos = {
  /** Nómina mensual: se paga por quincenas (día 15 y último día del mes). */
  nominaMensual: number;
  /** Arriendo, servicios y demás gastos fijos sin la nómina: día 1. */
  gastosFijosMensuales: number;
  /** Cuotas de créditos: día 5. */
  cuotaDeudaMensual: number;
  /** Pagos a proveedores: cada viernes. */
  proveedoresSemanales: number;
  /** Retención, IVA y demás impuestos del mes: día 18. */
  impuestosMensuales: number;
  /** Ventas que entran de contado (taquilla, mostrador): repartidas por día. */
  ventasContadoSemanales: number;
  /** Días que tardan los clientes en pagar una venta a crédito. */
  diasCobro: number;
};

/** Un negocio abierto del CRM. `id` enlaza a su ficha en el Pipeline. */
export type NegocioPipeline = { id?: string; titulo: string; etapa?: string; valor: number; probabilidad: number | null; fechaCierre: string };

/** Llave estable de un negocio (el id; el título si no hay id). */
export const claveNegocio = (n: NegocioPipeline) => n.id ?? n.titulo;

export type Evento = { dia: string; monto: number; tipo: "cobro" | "pipeline" | "pago"; concepto: string };

export type Semana = { inicio: string; cobros: number; pipeline: number; pagos: number; saldo: number };

export type Proyeccion = {
  semanas: Semana[];
  eventos: Evento[];
  minimo: { saldo: number; dia: string };
  /** Primer día con saldo negativo, o null si alcanza las 13 semanas. */
  primerDiaEnRojo: string | null;
  saldoFinal: number;
};

// ── Fechas como días de calendario ──────────────────────────────────────────

const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);
const dos = (n: number) => String(n).padStart(2, "0");
const aDia = (d: Date) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
export function sumarDias(dia: string, n: number): string {
  const d = aFecha(dia);
  d.setUTCDate(d.getUTCDate() + n);
  return aDia(d);
}
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000);
}
const ultimoDiaDelMes = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

// ── Proyección ──────────────────────────────────────────────────────────────

type Entrada = {
  hoy: string;
  saldoInicial: number;
  /** Cuentas por cobrar del último balance: se cobran parejo en los próximos `diasCobro` días. */
  cartera: number;
  supuestos: Supuestos;
  pipeline: NegocioPipeline[];
  /** false = escenario "sin negocios nuevos". */
  conPipeline?: boolean;
};

/** Los eventos de caja (entradas y salidas) día a día durante 13 semanas. */
export function eventosDeCaja({ hoy, cartera, supuestos: s, pipeline, conPipeline = true }: Entrada): Evento[] {
  const fin = sumarDias(hoy, SEMANAS * 7 - 1);
  const ev: Evento[] = [];
  const agregar = (dia: string, monto: number, tipo: Evento["tipo"], concepto: string) => {
    if (dia >= hoy && dia <= fin && monto) ev.push({ dia, monto, tipo, concepto });
  };
  const plazo = Math.max(7, Math.round(s.diasCobro) || 30);

  for (let i = 0; i < SEMANAS * 7; i++) {
    const dia = sumarDias(hoy, i);
    const d = aFecha(dia);
    const fecha = d.getUTCDate();
    const mes = d.getUTCMonth() + 1;
    const ultimo = ultimoDiaDelMes(d);

    if (s.ventasContadoSemanales) agregar(dia, s.ventasContadoSemanales / 7, "cobro", "Ventas de contado");
    if (i < plazo && cartera) agregar(dia, cartera / plazo, "cobro", "Cartera por cobrar");

    if (fecha === 15 || fecha === ultimo) agregar(dia, -s.nominaMensual / 2, "pago", "Nómina (quincena)");
    if (fecha === 1) agregar(dia, -s.gastosFijosMensuales, "pago", "Gastos fijos (arriendo, servicios…)");
    if (fecha === 5) agregar(dia, -s.cuotaDeudaMensual, "pago", "Cuota de créditos");
    if (fecha === 18) agregar(dia, -s.impuestosMensuales, "pago", "Impuestos del mes");
    if (d.getUTCDay() === 5) agregar(dia, -s.proveedoresSemanales, "pago", "Pago a proveedores");

    // Prestaciones de ley (estimadas sobre la nómina mensual).
    if (mes === 6 && fecha === 30) agregar(dia, -s.nominaMensual / 2, "pago", "Prima de servicios (junio)");
    if (mes === 12 && fecha === 20) agregar(dia, -s.nominaMensual / 2, "pago", "Prima de servicios (diciembre)");
    if (mes === 1 && fecha === 31) agregar(dia, -s.nominaMensual * 0.12, "pago", "Intereses sobre cesantías");
    if (mes === 2 && fecha === 14) agregar(dia, -s.nominaMensual, "pago", "Consignación de cesantías");
  }

  if (conPipeline) {
    for (const n of pipeline) {
      // Una fecha de cierre ya vencida se toma como "cierra hoy", y se dice:
      // conviene actualizarla en el CRM para que la proyección sea real.
      const vencido = n.fechaCierre < hoy;
      const cierre = vencido ? hoy : n.fechaCierre;
      agregar(sumarDias(cierre, plazo), n.valor * ((n.probabilidad ?? 50) / 100), "pipeline", vencido ? `${n.titulo} (cierre vencido)` : n.titulo);
    }
  }
  return ev.sort((a, b) => a.dia.localeCompare(b.dia) || b.monto - a.monto);
}

export function proyectarCaja(entrada: Entrada): Proyeccion {
  const eventos = eventosDeCaja(entrada);
  const semanas: Semana[] = Array.from({ length: SEMANAS }, (_, i) => ({
    inicio: sumarDias(entrada.hoy, i * 7), cobros: 0, pipeline: 0, pagos: 0, saldo: 0,
  }));

  let saldo = entrada.saldoInicial;
  let minimo = { saldo, dia: entrada.hoy };
  let primerDiaEnRojo: string | null = saldo < 0 ? entrada.hoy : null;
  for (const e of eventos) {
    saldo += e.monto;
    const w = semanas[Math.min(SEMANAS - 1, Math.floor(diasEntre(entrada.hoy, e.dia) / 7))];
    if (e.tipo === "pipeline") w.pipeline += e.monto;
    else if (e.monto > 0) w.cobros += e.monto;
    else w.pagos -= e.monto;
    if (saldo < minimo.saldo) minimo = { saldo, dia: e.dia };
    if (saldo < 0 && !primerDiaEnRojo) primerDiaEnRojo = e.dia;
  }
  let acumulado = entrada.saldoInicial;
  for (const w of semanas) {
    acumulado += w.cobros + w.pipeline - w.pagos;
    w.saldo = acumulado;
  }
  return { semanas, eventos, minimo, primerDiaEnRojo, saldoFinal: saldo };
}

/** Salidas fijas de un mes promedio (para los días de caja). */
export function salidasMensuales(s: Supuestos): number {
  return s.nominaMensual + s.gastosFijosMensuales + s.cuotaDeudaMensual + s.impuestosMensuales + (s.proveedoresSemanales * 52) / 12;
}

/** Cuántos días alcanza la caja si no entrara un peso más. null sin salidas. */
export function diasDeCaja(saldo: number, s: Supuestos): number | null {
  const diario = salidasMensuales(s) / 30;
  if (diario <= 0) return null;
  return Math.max(0, Math.floor(saldo / diario));
}

// ── Punto de equilibrio ─────────────────────────────────────────────────────

export type PuntoEquilibrio = {
  /** Ventas mensuales que cubren los gastos fijos. */
  ventasNecesarias: number;
  gastosFijos: number;
  margenContribucion: number;
  ventasUltimoMes: number;
  mesUltimo: string;
};

/**
 * Con los últimos 3 meses: margen de contribución (1 − costo/ventas) y gastos
 * fijos promedio (administración, ventas, depreciación e intereses). null si
 * no hay ventas o el costo se come toda la venta.
 */
export function puntoEquilibrio(periodos: Periodo[]): PuntoEquilibrio | null {
  const tres = ultimosMeses(periodos, 3);
  const ventas = tres.reduce((a, p) => a + p.ventas, 0);
  const costo = tres.reduce((a, p) => a + p.costoVentas, 0);
  if (ventas <= 0) return null;
  const margenContribucion = 1 - costo / ventas;
  if (margenContribucion <= 0) return null;
  const gastosFijos = tres.reduce((a, p) => a + p.gastosAdmin + p.gastosVentas + p.depreciacion + p.intereses, 0) / tres.length;
  const ultimo = tres[tres.length - 1];
  return { ventasNecesarias: gastosFijos / margenContribucion, gastosFijos, margenContribucion, ventasUltimoMes: ultimo.ventas, mesUltimo: ultimo.mes };
}

// ── Supuestos sugeridos ─────────────────────────────────────────────────────

/**
 * Punto de partida cuando el cliente todavía no ha llenado sus supuestos:
 * sale del promedio de sus últimos 3 meses. La nómina viene dentro de los
 * gastos de administración, así que queda en 0 hasta que el cliente la separe.
 */
export function supuestosSugeridos(periodos: Periodo[], diasCartera: number | null): Supuestos {
  const tres = ultimosMeses(periodos, 3);
  const n = Math.max(1, tres.length);
  const prom = (f: (p: Periodo) => number) => tres.reduce((a, p) => a + f(p), 0) / n;
  return {
    nominaMensual: 0,
    gastosFijosMensuales: Math.round(prom(p => p.gastosAdmin + p.gastosVentas)),
    cuotaDeudaMensual: Math.round(prom(p => p.intereses)),
    proveedoresSemanales: Math.round((prom(p => p.costoVentas) * 12) / 52),
    impuestosMensuales: 0,
    ventasContadoSemanales: 0,
    diasCobro: diasCartera ? Math.round(diasCartera) : 30,
  };
}
