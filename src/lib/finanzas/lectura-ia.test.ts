import { describe, it, expect } from "vitest";
import { limpiarLecturaIA, mesesEntre, repartirAcumulado, anioCompleto, type LecturaIA } from "./lectura-ia";

const M = 1_000_000;
const ceros = { ventas: 0, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0, otrosIngresos: 0, otrosGastos: 0, impuestoRenta: null };
const base: LecturaIA = {
  unidadDocumento: "pesos", meses: [], acumulado: null, acumuladoAnterior: null, balance: null, balanceAnterior: null, actividad: "", advertencias: [],
};
const balanceCero = { caja: 0, cuentasPorCobrar: 0, inventario: 0, otrosActivosCorrientes: 0, inversiones: 0, activosFijos: 0,
  proveedores: 0, obligacionesCP: 0, impuestosLaborales: 0, deudaLP: 0, patrimonio: 0 };

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

  it("conserva el patrimonio negativo, separa las inversiones y valida la fecha de corte", () => {
    const balance = { ...balanceCero, corte: "2026-09-30", caja: 10, inversiones: -7, proveedores: -5, patrimonio: -20 };
    const r = limpiarLecturaIA({ ...base, balance });
    expect(r.balance).toMatchObject({ corte: "2026-09-30", proveedores: 5, inversiones: 7, patrimonio: -20 });
    expect(limpiarLecturaIA({ ...base, balance: { ...balance, corte: "30/09/2026" } }).balance).toBeNull();
  });

  it("acepta un acumulado con rango válido", () => {
    const r = limpiarLecturaIA({ ...base, acumulado: { desde: "2026-01", hasta: "2026-06", ...ceros, ventas: 600 } });
    expect(r.acumulado).toMatchObject({ desde: "2026-01", hasta: "2026-06", ventas: 600 });
    expect(limpiarLecturaIA({ ...base, acumulado: { desde: "2026-06", hasta: "2026-01", ...ceros } }).acumulado).toBeNull();
  });

  it("lee un cierre anual con el año anterior, las partidas no operacionales, el impuesto real y la actividad", () => {
    // Como Huertas de El Cedro: el año 2025 al lado de 2024 y los dos balances.
    const r = limpiarLecturaIA({
      ...base,
      acumulado: { desde: "2025-01", hasta: "2025-12", ...ceros, ventas: 2299.4 * M, gastosAdmin: 1664 * M, otrosIngresos: 29.3 * M, otrosGastos: -315.2 * M, impuestoRenta: 180 * M },
      acumuladoAnterior: { desde: "2024-01", hasta: "2024-12", ...ceros, ventas: 2117.6 * M, impuestoRenta: 201.5 * M },
      balance: { ...balanceCero, corte: "2025-12-31", caja: 173 * M, patrimonio: 173 * M },
      balanceAnterior: { ...balanceCero, corte: "2024-12-31", caja: 85.5 * M, patrimonio: 85.5 * M },
      actividad: "  Arrendamiento de bienes inmuebles y alquiler de un teatro.  ",
    });
    expect(r.acumulado).toMatchObject({ otrosIngresos: 29.3 * M, otrosGastos: 315.2 * M, impuestoRenta: 180 * M });
    expect(r.acumuladoAnterior).toMatchObject({ desde: "2024-01", ventas: 2117.6 * M, impuestoRenta: 201.5 * M });
    expect(r.balanceAnterior?.corte).toBe("2024-12-31");
    expect(r.actividad).toBe("Arrendamiento de bienes inmuebles y alquiler de un teatro.");
  });

  it("sin impuesto en el documento lo deja en null (se estima después); descarta comparativos que no son anteriores", () => {
    const r = limpiarLecturaIA({
      ...base,
      acumulado: { desde: "2025-01", hasta: "2025-12", ...ceros, ventas: 100 },
      acumuladoAnterior: { desde: "2025-01", hasta: "2025-12", ...ceros, ventas: 90 },
      balance: { ...balanceCero, corte: "2025-12-31" },
      balanceAnterior: { ...balanceCero, corte: "2026-03-31" },
    });
    expect(r.acumulado?.impuestoRenta).toBeNull();
    expect(r.acumuladoAnterior).toBeNull();
    expect(r.balanceAnterior).toBeNull();
  });
});

describe("repartir un acumulado", () => {
  it("cuenta los meses del rango, cruzando el año", () => {
    expect(mesesEntre("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mesesEntre("2026-03", "2026-01")).toEqual([]);
  });

  it("divide en partes iguales, también las partidas no operacionales y el impuesto", () => {
    const meses = repartirAcumulado({ desde: "2026-01", hasta: "2026-03", ...ceros, ventas: 300, intereses: 30, otrosGastos: 60, impuestoRenta: 90 });
    expect(meses).toHaveLength(3);
    expect(meses.every(m => m.ventas === 100 && m.intereses === 10 && m.otrosGastos === 20 && m.impuestoRenta === 30)).toBe(true);
  });

  it("reconoce un año calendario completo", () => {
    expect(anioCompleto({ desde: "2025-01", hasta: "2025-12" })).toBe(2025);
    expect(anioCompleto({ desde: "2025-01", hasta: "2025-09" })).toBeNull();
    expect(anioCompleto({ desde: "2024-07", hasta: "2025-06" })).toBeNull();
  });
});
