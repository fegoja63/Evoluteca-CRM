import { describe, it, expect } from "vitest";
import { idsReemplazadas, valorCotizacion, type CotizacionResumen } from "./cotizaciones";

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

// valorCotizacion es la fórmula que fija el valor del negocio en el pipeline,
// tanto al crear como al recalcular cuando se editan los ítems. Es el valor
// NETO de impuestos (base del contrato según la modalidad).
describe("valorCotizacion", () => {
  it("fee fijo: suma cantidad × precio de los ítems", () => {
    const v = valorCotizacion({
      modalidad: "FEE_FIJO",
      items: [
        { cantidad: 2, precioUnit: 100 },
        { cantidad: 1, precioUnit: 50 },
      ],
    });
    expect(v).toBe(250);
  });

  it("fee fijo: los ítems como string (Decimal serializado) también suman", () => {
    const v = valorCotizacion({ modalidad: "FEE_FIJO", items: [{ cantidad: 3, precioUnit: "1000" }] });
    expect(v).toBe(3000);
  });

  it("success fee: Σ ahorro mensual × % honorarios × meses", () => {
    const v = valorCotizacion({
      modalidad: "SUCCESS_FEE",
      lineasAhorro: [
        { gastoBaseMensual: 0, ahorroEstimadoMensual: 1_000_000 },
        { gastoBaseMensual: 0, ahorroEstimadoMensual: 500_000 },
      ],
      porcentajeHonorarios: 10,
      horizonteMeses: 12,
    });
    // (1.000.000 + 500.000) × 10% × 12 = 1.800.000
    expect(v).toBe(1_800_000);
  });

  it("fee mensual: fee × meses", () => {
    const v = valorCotizacion({ modalidad: "FEE_MENSUAL", feeMensual: 2_000_000, horizonteMeses: 6 });
    expect(v).toBe(12_000_000);
  });

  it("no incluye impuestos: el valor es la base neta, no el total con IVA", () => {
    // Aunque la cotización tuviera IVA, valorCotizacion devuelve solo la base.
    const v = valorCotizacion({ modalidad: "FEE_FIJO", items: [{ cantidad: 1, precioUnit: 1000 }] });
    expect(v).toBe(1000); // no 1190
  });
});
