import { describe, it, expect } from "vitest";
import { limpiarLecturaIA, mesesEntre, repartirAcumulado, type LecturaIA } from "./lectura-ia";

const M = 1_000_000;
const ceros = { ventas: 0, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0 };
const base: LecturaIA = { unidadDocumento: "pesos", meses: [], acumulado: null, balance: null, advertencias: [] };

describe("limpiarLecturaIA", () => {
  it("ordena los meses y deja costos y gastos en positivo", () => {
    const r = limpiarLecturaIA({
      ...base,
      meses: [
        { mes: "2026-02", ...ceros, ventas: 88 * M, costoVentas: -43 * M },
        { mes: "2026-01", ...ceros, ventas: 74 * M, gastosAdmin: -30 * M },
      ],
    });
    expect(r.periodos.map(p => p.mes)).toEqual(["2026-01", "2026-02"]);
    expect(r.periodos[1].costoVentas).toBe(43 * M);
    expect(r.periodos[0].gastosAdmin).toBe(30 * M);
  });

  it("descarta meses con fecha o montos inválidos y lo advierte", () => {
    const r = limpiarLecturaIA({
      ...base,
      meses: [{ mes: "enero", ...ceros, ventas: 1 }, { mes: "2026-03", ...ceros, ventas: Infinity }],
    });
    expect(r.periodos).toEqual([]);
    expect(r.advertencias).toHaveLength(2);
  });

  it("conserva el patrimonio negativo y valida la fecha de corte", () => {
    const balance = { corte: "2026-09-30", caja: 10, cuentasPorCobrar: 0, inventario: 0, otrosActivosCorrientes: 0, activosFijos: 0,
      proveedores: -5, obligacionesCP: 0, impuestosLaborales: 0, deudaLP: 0, patrimonio: -20 };
    const r = limpiarLecturaIA({ ...base, balance });
    expect(r.balance).toMatchObject({ corte: "2026-09-30", proveedores: 5, patrimonio: -20 });
    expect(limpiarLecturaIA({ ...base, balance: { ...balance, corte: "30/09/2026" } }).balance).toBeNull();
  });

  it("acepta un acumulado con rango válido", () => {
    const r = limpiarLecturaIA({ ...base, acumulado: { desde: "2026-01", hasta: "2026-06", ...ceros, ventas: 600 } });
    expect(r.acumulado).toMatchObject({ desde: "2026-01", hasta: "2026-06", ventas: 600 });
    expect(limpiarLecturaIA({ ...base, acumulado: { desde: "2026-06", hasta: "2026-01", ...ceros } }).acumulado).toBeNull();
  });
});

describe("repartir un acumulado", () => {
  it("cuenta los meses del rango, cruzando el año", () => {
    expect(mesesEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mesesEntre("2026-03", "2026-01")).toEqual([]);
  });

  it("divide en partes iguales", () => {
    const meses = repartirAcumulado({ desde: "2026-01", hasta: "2026-03", ...ceros, ventas: 300, intereses: 30 });
    expect(meses).toHaveLength(3);
    expect(meses.every(m => m.ventas === 100 && m.intereses === 10)).toBe(true);
  });
});
