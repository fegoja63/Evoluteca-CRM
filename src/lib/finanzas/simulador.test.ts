import { describe, it, expect } from "vitest";
import { aplicarEscenario, esBase, rescateDeCaja, ESCENARIO_BASE } from "./simulador";
import { proyectarCaja, type Supuestos } from "./caja";

const M = 1_000_000;
const SUPUESTOS: Supuestos = {
  nominaMensual: 40 * M, gastosFijosMensuales: 10 * M, cuotaDeudaMensual: 5 * M, proveedoresSemanales: 10 * M,
  impuestosMensuales: 3 * M, ventasContadoSemanales: 20 * M, diasCobro: 30,
};
const PIPELINE = [
  { titulo: "Grande", valor: 100 * M, probabilidad: 60, fechaCierre: "2026-10-10" },
  { titulo: "Sin probabilidad", valor: 10 * M, probabilidad: null, fechaCierre: "2026-10-20" },
];

describe("aplicarEscenario", () => {
  it("el escenario base no cambia nada", () => {
    const r = aplicarEscenario(SUPUESTOS, PIPELINE, ESCENARIO_BASE);
    expect(r.supuestos).toEqual(SUPUESTOS);
    expect(r.pipeline.map(n => n.probabilidad)).toEqual([60, 50]);
    expect(esBase(ESCENARIO_BASE)).toBe(true);
  });

  it("aplica cada palanca", () => {
    const r = aplicarEscenario(SUPUESTOS, PIPELINE, {
      ...ESCENARIO_BASE, cumplimientoPipeline: 50, retrasoCobros: 15, variacionNomina: 10, variacionGastos: -20, variacionContado: -50,
    });
    expect(r.supuestos.nominaMensual).toBeCloseTo(44 * M);
    expect(r.supuestos.gastosFijosMensuales).toBeCloseTo(8 * M);
    expect(r.supuestos.proveedoresSemanales).toBeCloseTo(8 * M);
    expect(r.supuestos.ventasContadoSemanales).toBeCloseTo(10 * M);
    expect(r.supuestos.diasCobro).toBe(45);
    expect(r.supuestos.cuotaDeudaMensual).toBe(5 * M); // los créditos no cambian
    expect(r.pipeline.map(n => n.probabilidad)).toEqual([30, 25]);
  });

  it("la probabilidad no pasa de 100 %", () => {
    const r = aplicarEscenario(SUPUESTOS, PIPELINE, { ...ESCENARIO_BASE, cumplimientoPipeline: 150 });
    expect(r.pipeline[0].probabilidad).toBe(90);
    expect(aplicarEscenario(SUPUESTOS, [{ ...PIPELINE[0], probabilidad: 80 }], { ...ESCENARIO_BASE, cumplimientoPipeline: 150 }).pipeline[0].probabilidad).toBe(100);
  });

  it("retrasar los cobros empeora el punto más bajo", () => {
    const base = { hoy: "2026-10-01", saldoInicial: 60 * M, cartera: 90 * M };
    const normal = proyectarCaja({ ...base, ...aplicarEscenario(SUPUESTOS, PIPELINE, ESCENARIO_BASE) });
    const lento = proyectarCaja({ ...base, ...aplicarEscenario(SUPUESTOS, PIPELINE, { ...ESCENARIO_BASE, retrasoCobros: 45 }) });
    expect(lento.minimo.saldo).toBeLessThan(normal.minimo.saldo);
  });

  it("suma personas nuevas a la nómina y fuerza cierres al 100 %", () => {
    const r = aplicarEscenario(SUPUESTOS, PIPELINE, { ...ESCENARIO_BASE, personasNuevas: 2, costoPersona: 5 * M, forzados: ["Sin probabilidad"] });
    expect(r.supuestos.nominaMensual).toBe(50 * M);
    expect(r.pipeline.map(n => n.probabilidad)).toEqual([60, 100]);
    expect(esBase({ ...ESCENARIO_BASE, forzados: ["x"] })).toBe(false);
  });
});

describe("rescateDeCaja", () => {
  const base = { hoy: "2026-10-01", saldoInicial: 30 * M, cartera: 0, supuestos: { ...SUPUESTOS, ventasContadoSemanales: 0, diasCobro: 7 } };

  it("elige primero el negocio que más sube el punto más bajo y dice si lo resuelve", () => {
    // Sin rescate la caja queda en rojo el 9 oct; un cierre de hoy cobra el 8 (7 días).
    const pipeline = [
      { id: "chico", titulo: "Chico", valor: 5 * M, probabilidad: 10, fechaCierre: "2026-10-01" },
      { id: "grande", titulo: "Grande", valor: 400 * M, probabilidad: 10, fechaCierre: "2026-10-01" },
      { id: "tarde", titulo: "Tarde", valor: 900 * M, probabilidad: 10, fechaCierre: "2026-12-20" },
    ];
    const r = rescateDeCaja({ ...base, pipeline })!;
    expect(r.negocios[0].id).toBe("grande");
    expect(r.resuelve).toBe(true);
  });

  it("sin rojo, o sin pipeline, no hay rescate", () => {
    expect(rescateDeCaja({ ...base, saldoInicial: 2_000 * M, pipeline: PIPELINE })).toBeNull();
    expect(rescateDeCaja({ ...base, pipeline: [] })).toBeNull();
  });

  it("si ningún negocio llega antes del hueco, no propone nada", () => {
    const r = rescateDeCaja({ ...base, pipeline: [{ id: "lejos", titulo: "Lejos", valor: 900 * M, probabilidad: 10, fechaCierre: "2027-03-01" }] });
    expect(r).toBeNull();
  });
});
