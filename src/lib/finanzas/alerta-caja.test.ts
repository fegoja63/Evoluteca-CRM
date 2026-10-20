import { describe, it, expect } from "vitest";
import { alertaCaja } from "./alerta-caja";
import type { Supuestos } from "./caja";

const M = 1_000_000;
const HOY = "2026-10-01";
const SUPUESTOS: Supuestos = {
  nominaMensual: 40 * M, gastosFijosMensuales: 10 * M, cuotaDeudaMensual: 0, proveedoresSemanales: 10 * M,
  impuestosMensuales: 0, ventasContadoSemanales: 0, diasCobro: 7,
};
// Salidas de un mes promedio: 40 + 10 + 10×52/12 ≈ 93,3 M. En las 13 semanas desde el
// 1 de octubre salen 280 M: 5 quincenas, prima de diciembre, 3 gastos fijos y 13 viernes.

describe("alertaCaja", () => {
  it("rojo: dice en cuántos días y cuándo", () => {
    const a = alertaCaja({ hoy: HOY, caja: 30 * M, cartera: 0, supuestos: SUPUESTOS, pipeline: [] });
    expect(a.nivel).toBe("rojo");
    expect(a.titulo).toBe("En 14 días la caja queda en rojo: el 15 oct");
    expect(a.detalle).not.toContain("pipeline");
  });

  it("verde con pipeline: compara con el escenario sin negocios nuevos", () => {
    const a = alertaCaja({
      hoy: HOY, caja: 200 * M, cartera: 0, supuestos: SUPUESTOS,
      pipeline: [{ titulo: "Grande", valor: 1_000 * M, probabilidad: 100, fechaCierre: "2026-10-10" }],
    });
    expect(a.nivel).toBe("verde");
    expect(a.detalle).toMatch(/Sin cerrar negocios nuevos, quedaría en rojo el/);
  });

  it("ámbar: alcanza, pero el punto más bajo cubre menos de 15 días de gastos", () => {
    // 320 − 280 = 40 M al final: menos de 15 días de gastos (≈ 46,7 M).
    const a = alertaCaja({ hoy: HOY, caja: 320 * M, cartera: 0, supuestos: SUPUESTOS, pipeline: [] });
    expect(a.conNegocios.primerDiaEnRojo).toBeNull();
    expect(a.nivel).toBe("ambar");
  });

  it("los días de caja salen del saldo de hoy", () => {
    const a = alertaCaja({ hoy: HOY, caja: 93.33 * M, cartera: 0, supuestos: SUPUESTOS, pipeline: [] });
    expect(a.diasCaja).toBe(29);
  });
});
