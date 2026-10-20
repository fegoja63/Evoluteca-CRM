import { describe, it, expect } from "vitest";
import { proyectarCaja, eventosDeCaja, diasDeCaja, puntoEquilibrio, supuestosSugeridos, sumarDias, diasEntre, SEMANAS, type Supuestos } from "./caja";
import type { Periodo } from "./estados";

const M = 1_000_000;
const SIN_NADA: Supuestos = {
  nominaMensual: 0, gastosFijosMensuales: 0, cuotaDeudaMensual: 0, proveedoresSemanales: 0,
  impuestosMensuales: 0, ventasContadoSemanales: 0, diasCobro: 30,
};
// Jueves 1 de octubre de 2026.
const HOY = "2026-10-01";

describe("fechas", () => {
  it("suma días cruzando meses y años", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(diasEntre("2026-10-01", "2026-10-15")).toBe(14);
  });
});

describe("eventos de caja", () => {
  it("paga la nómina por quincenas, gastos fijos el 1 y proveedores los viernes", () => {
    const ev = eventosDeCaja({ hoy: HOY, saldoInicial: 0, cartera: 0, pipeline: [],
      supuestos: { ...SIN_NADA, nominaMensual: 40 * M, gastosFijosMensuales: 9 * M, proveedoresSemanales: 18 * M } });
    const de = (c: string) => ev.filter(e => e.concepto.startsWith(c));
    expect(de("Nómina").slice(0, 2).map(e => [e.dia, e.monto])).toEqual([["2026-10-15", -20 * M], ["2026-10-31", -20 * M]]);
    expect(de("Gastos fijos")[0]).toMatchObject({ dia: "2026-10-01", monto: -9 * M });
    expect(de("Pago a proveedores")[0].dia).toBe("2026-10-02"); // primer viernes
    expect(de("Prima de servicios (diciembre)")[0]).toMatchObject({ dia: "2026-12-20", monto: -20 * M });
  });

  it("cobra la cartera parejo en los días de cobro", () => {
    const ev = eventosDeCaja({ hoy: HOY, saldoInicial: 0, cartera: 30 * M, pipeline: [], supuestos: { ...SIN_NADA, diasCobro: 30 } });
    const cobros = ev.filter(e => e.concepto === "Cartera por cobrar");
    expect(cobros).toHaveLength(30);
    expect(cobros.reduce((a, e) => a + e.monto, 0)).toBeCloseTo(30 * M);
  });

  it("el pipeline entra ponderado, días de cobro después del cierre; un cierre vencido cuenta desde hoy", () => {
    const ev = eventosDeCaja({ hoy: HOY, saldoInicial: 0, cartera: 0, supuestos: { ...SIN_NADA, diasCobro: 30 }, pipeline: [
      { titulo: "Bancolombia", valor: 48 * M, probabilidad: 70, fechaCierre: "2026-11-05" },
      { titulo: "Atrasado", valor: 10 * M, probabilidad: null, fechaCierre: "2026-08-01" },
      { titulo: "Muy lejos", valor: 99 * M, probabilidad: 90, fechaCierre: "2027-06-01" },
    ] });
    const p = ev.filter(e => e.tipo === "pipeline");
    expect(p.map(e => [e.concepto, e.dia, e.monto])).toEqual([
      ["Atrasado (cierre vencido)", "2026-10-31", 5 * M],
      ["Bancolombia", "2026-12-05", 48 * M * 0.7],
    ]);
  });
});

describe("proyectarCaja", () => {
  const supuestos = { ...SIN_NADA, nominaMensual: 40 * M, gastosFijosMensuales: 10 * M, proveedoresSemanales: 10 * M };

  it("arma 13 semanas y encuentra el primer día en rojo", () => {
    const p = proyectarCaja({ hoy: HOY, saldoInicial: 30 * M, cartera: 0, pipeline: [], supuestos });
    expect(p.semanas).toHaveLength(SEMANAS);
    // 30 − 10 (día 1) − 10 (viernes 2) − 10 (viernes 9) = 0; el 15 la quincena lo deja en rojo.
    expect(p.primerDiaEnRojo).toBe("2026-10-15");
    expect(p.semanas[SEMANAS - 1].saldo).toBeCloseTo(p.saldoFinal);
  });

  it("el pipeline puede rescatar la caja", () => {
    const base = { hoy: HOY, saldoInicial: 200 * M, cartera: 0, supuestos: { ...supuestos, diasCobro: 7 } };
    const negocio = [{ titulo: "Grande", valor: 500 * M, probabilidad: 100, fechaCierre: "2026-10-20" }];
    const sin = proyectarCaja({ ...base, pipeline: negocio, conPipeline: false });
    const con = proyectarCaja({ ...base, pipeline: negocio });
    expect(sin.primerDiaEnRojo).not.toBeNull();
    expect(con.primerDiaEnRojo).toBeNull();
    expect(con.semanas.reduce((a, w) => a + w.pipeline, 0)).toBe(500 * M);
  });
});

describe("días de caja", () => {
  it("divide la caja por la salida diaria promedio", () => {
    // 30 + 12×52/12 = 82 M al mes → 2,73 M al día; 41 M alcanzan 15 días.
    expect(diasDeCaja(41 * M, { ...SIN_NADA, nominaMensual: 30 * M, proveedoresSemanales: 12 * M })).toBe(15);
    expect(diasDeCaja(41 * M, SIN_NADA)).toBeNull();
  });
});

describe("punto de equilibrio y supuestos sugeridos", () => {
  const mes = (m: string, ventas: number, costo: number): Periodo =>
    ({ mes: m, ventas, costoVentas: costo, gastosAdmin: 30 * M, gastosVentas: 10 * M, depreciacion: 4 * M, intereses: 2 * M });
  const ps = [mes("2026-07", 128 * M, 64 * M), mes("2026-08", 124 * M, 62 * M), mes("2026-09", 136 * M, 68 * M)];

  it("ventas que cubren los gastos fijos con el margen de contribución", () => {
    const pe = puntoEquilibrio(ps)!;
    expect(pe.margenContribucion).toBeCloseTo(0.5);
    expect(pe.gastosFijos).toBe(46 * M);
    expect(pe.ventasNecesarias).toBeCloseTo(92 * M);
    expect(pe.ventasUltimoMes).toBe(136 * M);
  });

  it("sin ventas, o si el costo se come la venta, no hay punto de equilibrio", () => {
    expect(puntoEquilibrio([])).toBeNull();
    expect(puntoEquilibrio([mes("2026-09", 10, 12)])).toBeNull();
  });

  it("sugiere supuestos desde los estados", () => {
    const s = supuestosSugeridos(ps, 24.4);
    expect(s.gastosFijosMensuales).toBe(40 * M);
    // Costo promedio de los 3 meses: (64 + 62 + 68) / 3 millones, pasado a semanas.
    expect(s.proveedoresSemanales).toBe(Math.round((((64 + 62 + 68) / 3) * M * 12) / 52));
    expect(s.diasCobro).toBe(24);
    expect(s.nominaMensual).toBe(0);
  });
});
