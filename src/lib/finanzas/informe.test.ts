import { describe, it, expect } from "vitest";
import { mesMas, calcularCifras, limpiarTexto, proyectar, saludFinanciera, type EntradaCifras } from "./informe";
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
    expect(c.salud?.puntaje).toBeGreaterThanOrEqual(0);
    expect(c.caja?.semanasCon?.length).toBe(13);
    // Por cada $100: 50 de costo, 10 M/120 M de administración y la utilidad neta.
    expect(c.composicion?.costo).toBeCloseTo(50);
    expect(c.proyeccion?.proximos).toHaveLength(3);
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
  it("recorta listas, quita vacíos y ordena el plan por plazo", () => {
    const r = (accion: string, plazo: "30 días" | "60 días" | "90 días") => ({ accion, porque: "p", impacto: "i", plazo, responsable: "Gerencia" as const, indicador: " Días de caja: de 10 a 30 " });
    const t = limpiarTexto({
      titulo: " Hola ", resumenEjecutivo: "x", hallazgoPrincipal: " La caja alcanza 10 días ", decisionesUrgentes: ["a", "b", "c", "d"], resultados: ["uno", " "],
      balanceIndicadores: [], caja: [], clientes: [], proyeccion: ["sube"], riesgos: ["r1", "r2", "r3", "r4"], oportunidades: [" "], preguntasContador: [],
      recomendaciones: [r("", "30 días"), r("Renegociar deuda", "90 días"), r("Cobrar", "30 días"), r("Subir precios", "60 días")],
      metasProximoMes: [{ indicador: "Días de caja", actual: "10", meta: "30" }, { indicador: " ", actual: "", meta: "" }],
    });
    expect(t.titulo).toBe("Hola");
    expect(t.hallazgoPrincipal).toBe("La caja alcanza 10 días");
    expect(t.decisionesUrgentes).toHaveLength(3);
    expect(t.resultados).toEqual(["uno"]);
    expect(t.riesgos).toHaveLength(3);
    expect(t.oportunidades).toEqual([]);
    expect(t.recomendaciones.map(x => x.accion)).toEqual(["Cobrar", "Subir precios", "Renegociar deuda"]);
    expect(t.recomendaciones[0].indicador).toBe("Días de caja: de 10 a 30");
    expect(t.metasProximoMes).toEqual([{ indicador: "Días de caja", actual: "10", meta: "30" }]);
  });
});

describe("proyectar", () => {
  it("con año pasado usa la temporada × el crecimiento de los últimos 3 meses", () => {
    // 2025: 100 M cada mes y diciembre 200 M; 2026 hasta octubre a 110 M (crece 10 %).
    const orden = [
      ...["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"].map(m => p(`2025-${m}`, 100 * M)), p("2025-12", 200 * M),
      ...["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map(m => p(`2026-${m}`, 110 * M)),
    ];
    const r = proyectar(orden)!;
    expect(r.metodo).toBe("estacional");
    expect(r.crecimiento).toBeCloseTo(1.1);
    expect(r.proximos.map(x => x.mes)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(r.proximos[0].ventas).toBeCloseTo(110 * M);
    expect(r.proximos[1].ventas).toBeCloseTo(220 * M); // diciembre fuerte
    expect(r.anio?.mesesReales).toBe(10);
    expect(r.anio?.ventasCierre).toBeCloseTo(1100 * M + 110 * M + 220 * M);
    // Utilidad: margen 50 % y 10 M fijos → (110/2 − 10) × (1 − 35 %).
    expect(r.proximos[0].utilidadNeta).toBeCloseTo(45 * M * 0.65);
  });

  it("sin año pasado usa el promedio de los últimos 3 meses; sin meses no hay proyección", () => {
    const r = proyectar([p("2026-08", 90 * M), p("2026-09", 100 * M), p("2026-10", 110 * M)])!;
    expect(r.metodo).toBe("tendencia");
    expect(r.crecimiento).toBeNull();
    expect(r.proximos.every(x => Math.abs(x.ventas - 100 * M) < 1)).toBe(true);
    expect(proyectar([])).toBeNull();
  });
});

describe("saludFinanciera", () => {
  it("promedia los semáforos (bien 100, atención 50, riesgo 0) e ignora los vacíos", () => {
    expect(saludFinanciera(["bien", "bien", "atencion", null])).toEqual({ puntaje: 83, etiqueta: "Sólida", bien: 2, atencion: 1, riesgo: 0 });
    expect(saludFinanciera(["bien", "riesgo"])?.etiqueta).toBe("En atención");
    expect(saludFinanciera(["riesgo", "atencion", "riesgo"])?.etiqueta).toBe("Frágil");
    expect(saludFinanciera([null])).toBeNull();
  });
});
