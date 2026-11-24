import { describe, it, expect } from "vitest";
import { mesMas, calcularCifras, limpiarTexto, type EntradaCifras } from "./informe";
import { supuestosSugeridos } from "./caja";

const M = 1_000_000;
const p = (mes: string, ventas: number) => ({ mes, ventas, costoVentas: ventas / 2, gastosAdmin: 10 * M, gastosVentas: 0, depreciacion: 0, intereses: 0 });

function entrada(periodos: ReturnType<typeof p>[], conBalance = true): EntradaCifras {
  return {
    empresa: "Demo", hoy: "2026-11-24", periodos,
    balance: conBalance ? { corte: "2026-10-31", caja: 40 * M, cuentasPorCobrar: 90 * M, inventario: 0, otrosActivosCorrientes: 0, activosFijos: 100 * M,
      proveedores: 20 * M, obligacionesCP: 10 * M, impuestosLaborales: 5 * M, deudaLP: 50 * M, patrimonio: 145 * M } : null,
    supuestos: supuestosSugeridos(periodos, 30), pipeline: [],
  };
}

describe("mesMas", () => {
  it("suma y resta meses cruzando años", () => {
    expect(mesMas("2026-01", -1)).toBe("2025-12");
    expect(mesMas("2026-10", -12)).toBe("2025-10");
    expect(mesMas("2025-12", 1)).toBe("2026-01");
  });
});

describe("calcularCifras", () => {
  it("toma el último mes y lo compara con el anterior y el del año pasado", () => {
    const c = calcularCifras(entrada([p("2025-10", 80 * M), p("2026-09", 100 * M), p("2026-10", 120 * M)]))!;
    expect(c.mes).toBe("2026-10");
    expect(c.actual.ventas).toBe(120 * M);
    expect(c.anterior?.mes).toBe("2026-09");
    expect(c.anioAnterior?.mes).toBe("2025-10");
    expect(c.balance?.caja).toBe(40 * M);
    expect(c.caja).not.toBeNull();
    expect(c.indicadores.length).toBeGreaterThan(0);
  });

  it("sin el mes anterior o sin balance lo deja vacío; sin meses no hay informe", () => {
    const c = calcularCifras(entrada([p("2026-10", 120 * M)], false))!;
    expect(c.anterior).toBeNull();
    expect(c.anioAnterior).toBeNull();
    expect(c.balance).toBeNull();
    expect(c.caja).toBeNull();
    expect(calcularCifras(entrada([]))).toBeNull();
  });
});

describe("limpiarTexto", () => {
  it("recorta listas y quita vacíos", () => {
    const t = limpiarTexto({
      titulo: " Hola ", resumenEjecutivo: "x", decisionesUrgentes: ["a", "b", "c", "d"], resultados: ["uno", " "],
      balanceIndicadores: [], caja: [], clientes: [], preguntasContador: [],
      recomendaciones: [{ accion: "", porque: "", impacto: "" }, { accion: "Cobrar", porque: "p", impacto: "i" }],
    });
    expect(t.titulo).toBe("Hola");
    expect(t.decisionesUrgentes).toHaveLength(3);
    expect(t.resultados).toEqual(["uno"]);
    expect(t.recomendaciones).toEqual([{ accion: "Cobrar", porque: "p", impacto: "i" }]);
  });
});
