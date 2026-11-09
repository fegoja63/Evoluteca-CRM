import { describe, it, expect } from "vitest";
import { probabilidadDeEtapa, esEtapaCerrada, PROBABILIDAD_ETAPA_DEFECTO } from "./probabilidad-etapa";

describe("probabilidadDeEtapa", () => {
  it("usa los valores de fábrica 10 · 20 · 50 · 75", () => {
    expect(["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"].map(e => probabilidadDeEtapa(e))).toEqual([10, 20, 50, 75]);
  });

  it("usa la configurada por el tenant si la hay (incluido 0)", () => {
    expect(probabilidadDeEtapa("CALIFICADO", 25)).toBe(25);
    expect(probabilidadDeEtapa("PROSPECTO", 0)).toBe(0);
    expect(probabilidadDeEtapa("PROSPECTO", null)).toBe(PROBABILIDAD_ETAPA_DEFECTO.PROSPECTO);
  });

  it("Ganada es siempre 100 y Perdida 0, aunque haya otra configurada", () => {
    expect(probabilidadDeEtapa("GANADA", 40)).toBe(100);
    expect(probabilidadDeEtapa("PERDIDA", 40)).toBe(0);
    expect(esEtapaCerrada("GANADA") && esEtapaCerrada("PERDIDA") && !esEtapaCerrada("NEGOCIACION")).toBe(true);
  });
});
