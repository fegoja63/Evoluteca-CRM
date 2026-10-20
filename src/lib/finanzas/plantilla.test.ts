import { describe, it, expect } from "vitest";
import { leerMes, leerMonto, leerPlantilla, filasDeCsv } from "./plantilla";

describe("leerMes", () => {
  it("entiende los formatos que escribe la gente", () => {
    expect(leerMes("2026-01")).toBe("2026-01");
    expect(leerMes("2026/3")).toBe("2026-03");
    expect(leerMes("01/2026")).toBe("2026-01");
    expect(leerMes("ene 2026")).toBe("2026-01");
    expect(leerMes("Septiembre de 2025")).toBe("2025-09");
    expect(leerMes("dic-25")).toBe("2025-12");
    expect(leerMes(new Date(Date.UTC(2026, 4, 1)))).toBe("2026-05");
  });
  it("rechaza lo que no es un mes", () => {
    expect(leerMes("2026-13")).toBeNull();
    expect(leerMes("hola")).toBeNull();
    expect(leerMes("")).toBeNull();
  });
});

describe("leerMonto", () => {
  it("formato colombiano y negativos de contador", () => {
    expect(leerMonto("$ 4.800.000")).toBe(4_800_000);
    expect(leerMonto("1.200,50")).toBe(1200.5);
    expect(leerMonto("(1.200)")).toBe(-1200);
    expect(leerMonto("-$350.000")).toBe(-350_000);
    expect(leerMonto(1234.567)).toBe(1234.567);
    expect(leerMonto("")).toBeNull();
  });
});

describe("leerPlantilla", () => {
  it("lee las filas, aplica la unidad y ordena por mes", () => {
    const { periodos, errores } = leerPlantilla([
      ["Mes", "Ventas", "Costo de ventas", "Gastos de administración", "Gastos de ventas", "Depreciación", "Intereses"],
      ["2026-02", "88", "43", "30", "7", "4", "2"],
      ["2026-01", "74", "37", "30", "6", "4", "2"],
    ], "millones");
    expect(errores).toEqual([]);
    expect(periodos.map(p => p.mes)).toEqual(["2026-01", "2026-02"]);
    expect(periodos[0].ventas).toBe(74_000_000);
    expect(periodos[1].costoVentas).toBe(43_000_000);
  });

  it("reconoce encabezados con otro nombre y columnas que faltan", () => {
    const { periodos } = leerPlantilla([["Periodo", "Ingresos operacionales"], ["2026-01", "1.000.000"]]);
    expect(periodos).toHaveLength(1);
    expect(periodos[0].ventas).toBe(1_000_000);
    expect(periodos[0].intereses).toBe(0);
  });

  it("explica cada fila que no se pudo leer", () => {
    const { periodos, errores } = leerPlantilla([
      ["Mes", "Ventas", "Intereses"],
      ["marzo", "10", "0"],
      ["2026-04", "", "0"],
      ["2026-05", "10", "abc"],
    ]);
    expect(periodos.map(p => p.mes)).toEqual(["2026-05"]);
    expect(errores).toHaveLength(3);
    expect(errores[0]).toContain("Fila 2");
    expect(errores[1]).toContain("falta el valor de ventas");
    expect(errores[2]).toContain("no es un monto válido");
  });

  it("sin las columnas clave pide usar la plantilla", () => {
    const { errores } = leerPlantilla([["Nombre", "Valor"], ["x", "1"]]);
    expect(errores[0]).toContain("Use la plantilla");
  });
});

describe("filasDeCsv", () => {
  it("detecta el separador ; de Excel en español", () => {
    expect(filasDeCsv("mes;ventas\n2026-01;1.200,50\n")).toEqual([["mes", "ventas"], ["2026-01", "1.200,50"]]);
  });
});
