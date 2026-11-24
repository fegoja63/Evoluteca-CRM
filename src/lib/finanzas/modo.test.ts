import { describe, it, expect } from "vitest";
import { modoAnalisis, mesesDelCierre, mesesDesde, ACLARACION_MODO } from "./modo";
import type { Periodo } from "./estados";

const p = (mes: string, ventas = 120): Periodo => ({ mes, ventas, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0 });

describe("modoAnalisis", () => {
  it("es anual si hay un cierre y ningún mes posterior", () => {
    expect(modoAnalisis([], [p("2025")])).toBe("anual");
    expect(modoAnalisis([p("2025-06")], [p("2024"), p("2025")])).toBe("anual");
  });

  it("es mensual sin cierres o si hay meses después del último cierre", () => {
    expect(modoAnalisis([p("2026-01")], [])).toBe("mensual");
    expect(modoAnalisis([p("2026-01")], [p("2025")])).toBe("mensual");
  });
});

describe("mesesDelCierre", () => {
  it("reparte el año en 12 promedios para la caja, con lo no operacional y el impuesto", () => {
    const m = mesesDelCierre({ ...p("2025", 1200), otrosGastos: 120, impuestoRenta: 24 });
    expect(m).toHaveLength(12);
    expect(m[0].mes).toBe("2025-01");
    expect(m[11]).toMatchObject({ mes: "2025-12", ventas: 100, otrosGastos: 10, impuestoRenta: 2 });
    expect(mesesDelCierre(undefined)).toEqual([]);
  });
});

describe("mesesDesde y aclaración", () => {
  it("cuenta los meses desde el final del periodo", () => {
    expect(mesesDesde("2025", "2026-11-24")).toBe(11);
    expect(mesesDesde("2026-10", "2026-11-24")).toBe(1);
    expect(mesesDesde("2026-11", "2026-11-24")).toBe(0);
  });

  it("explica que los resultados mensuales y anuales no son iguales", () => {
    expect(ACLARACION_MODO.anual).toContain("año ÷ 12");
    expect(ACLARACION_MODO.mensual).toContain("35 %");
  });
});
