import { describe, it, expect } from "vitest";
import { esVerticalEspacios, tiposActividadVisibles } from "./tipos-actividad";

describe("esVerticalEspacios", () => {
  it("es true con el módulo funciones (teatros) activo", () => {
    expect(esVerticalEspacios({ funciones: true })).toBe(true);
  });
  it("es true con el módulo salones (alquileres) activo", () => {
    expect(esVerticalEspacios({ salones: true })).toBe(true);
  });
  it("es false sin funciones ni salones", () => {
    expect(esVerticalEspacios({ expedientes: true })).toBe(false);
    expect(esVerticalEspacios({})).toBe(false);
  });
  it("es robusto ante modulos null/no-objeto", () => {
    expect(esVerticalEspacios(null)).toBe(false);
    expect(esVerticalEspacios(undefined)).toBe(false);
    expect(esVerticalEspacios("no-es-objeto")).toBe(false);
  });
});

describe("tiposActividadVisibles", () => {
  it("oculta las visitas fuera del vertical de teatros/alquileres", () => {
    const keys = tiposActividadVisibles({ expedientes: true }).map((t) => t.key);
    expect(keys).toEqual(["TAREA", "LLAMADA", "REUNION", "EMAIL"]);
    expect(keys).not.toContain("VISITA_COMERCIAL");
    expect(keys).not.toContain("VISITA_TECNICA");
  });
  it("ofrece las visitas cuando funciones o salones está activo", () => {
    const keys = tiposActividadVisibles({ salones: true }).map((t) => t.key);
    expect(keys).toContain("VISITA_COMERCIAL");
    expect(keys).toContain("VISITA_TECNICA");
  });
});
