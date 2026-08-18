import { describe, it, expect } from "vitest";
import { filtroAnioCreacion } from "./filtros";

describe("filtroAnioCreacion", () => {
  it("devuelve {} cuando el año es nulo/indefinido/vacío", () => {
    expect(filtroAnioCreacion(null)).toEqual({});
    expect(filtroAnioCreacion(undefined)).toEqual({});
    expect(filtroAnioCreacion("")).toEqual({});
  });

  it("devuelve {} cuando el año no es un 'YYYY' válido", () => {
    expect(filtroAnioCreacion("abc")).toEqual({});
    expect(filtroAnioCreacion("20")).toEqual({});
    expect(filtroAnioCreacion("2026-01")).toEqual({});
  });

  it("acota el rango a [1-ene-AÑO, 1-ene-AÑO+1) en UTC", () => {
    const f = filtroAnioCreacion("2026") as { creadoEn: { gte: Date; lt: Date } };
    expect(f.creadoEn.gte.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(f.creadoEn.lt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("un cliente del 31-dic entra; el 1-ene del año siguiente no", () => {
    const { creadoEn } = filtroAnioCreacion("2025") as { creadoEn: { gte: Date; lt: Date } };
    const finDe2025 = new Date("2025-12-31T23:59:59.000Z");
    const inicioDe2026 = new Date("2026-01-01T00:00:00.000Z");
    expect(finDe2025 >= creadoEn.gte && finDe2025 < creadoEn.lt).toBe(true);
    expect(inicioDe2026 < creadoEn.lt).toBe(false);
  });
});
