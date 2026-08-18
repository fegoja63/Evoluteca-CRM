import { describe, it, expect } from "vitest";
import { filtroPeriodoCreacion } from "./filtros";

type Rango = { creadoEn: { gte: Date; lt: Date } };

describe("filtroPeriodoCreacion", () => {
  it("devuelve {} cuando el año es nulo/indefinido/vacío", () => {
    expect(filtroPeriodoCreacion(null)).toEqual({});
    expect(filtroPeriodoCreacion(undefined)).toEqual({});
    expect(filtroPeriodoCreacion("")).toEqual({});
  });

  it("devuelve {} cuando el año no es un 'YYYY' válido", () => {
    expect(filtroPeriodoCreacion("abc")).toEqual({});
    expect(filtroPeriodoCreacion("20")).toEqual({});
    expect(filtroPeriodoCreacion("2026-01")).toEqual({});
  });

  it("solo año → acota a [1-ene-AÑO, 1-ene-AÑO+1) en UTC", () => {
    const f = filtroPeriodoCreacion("2026") as Rango;
    expect(f.creadoEn.gte.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(f.creadoEn.lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("año + mes → acota al mes en UTC", () => {
    const f = filtroPeriodoCreacion("2026", "03") as Rango;
    expect(f.creadoEn.gte.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(f.creadoEn.lt.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("diciembre → el límite superior es 1-ene del año siguiente", () => {
    const f = filtroPeriodoCreacion("2025", "12") as Rango;
    expect(f.creadoEn.gte.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(f.creadoEn.lt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("mes inválido se ignora → cae al rango del año completo", () => {
    const f = filtroPeriodoCreacion("2026", "13") as Rango;
    expect(f.creadoEn.gte.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(f.creadoEn.lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("mes sin año no aplica (año manda)", () => {
    expect(filtroPeriodoCreacion(null, "03")).toEqual({});
  });
});
