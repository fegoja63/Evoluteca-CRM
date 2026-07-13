import { describe, it, expect } from "vitest";
import { idsReemplazadas, type CotizacionResumen } from "./cotizaciones";

const c = (id: string, numero: number, estado: string, oportunidadId: string | null): CotizacionResumen =>
  ({ id, numero, estado, oportunidadId });

describe("idsReemplazadas", () => {
  it("una sola cotización nunca está reemplazada", () => {
    const set = idsReemplazadas([c("a", 1, "BORRADOR", "op1")]);
    expect(set.size).toBe(0);
  });

  it("la más reciente es vigente; las anteriores quedan reemplazadas", () => {
    const set = idsReemplazadas([
      c("a", 1, "BORRADOR", "op1"),
      c("b", 2, "BORRADOR", "op1"),
      c("d", 3, "BORRADOR", "op1"),
    ]);
    expect(Array.from(set).sort()).toEqual(["a", "b"]);
    expect(set.has("d")).toBe(false); // la mayor (numero 3) es la vigente
  });

  it("una ACEPTADA es la vigente aunque no sea la más reciente", () => {
    const set = idsReemplazadas([
      c("a", 1, "ACEPTADA", "op1"),
      c("b", 5, "BORRADOR", "op1"),
    ]);
    expect(set.has("a")).toBe(false); // la aceptada gana
    expect(set.has("b")).toBe(true);
  });

  it("cotizaciones de negocios distintos no se afectan entre sí", () => {
    const set = idsReemplazadas([
      c("a", 1, "BORRADOR", "op1"),
      c("b", 2, "BORRADOR", "op2"),
    ]);
    expect(set.size).toBe(0);
  });

  it("cotizaciones sin negocio (oportunidadId null) nunca se reemplazan", () => {
    const set = idsReemplazadas([
      c("a", 1, "BORRADOR", null),
      c("b", 2, "BORRADOR", null),
    ]);
    expect(set.size).toBe(0);
  });
});
