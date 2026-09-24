import { describe, it, expect } from "vitest";
import { estadoRenovacion, renovacionPendiente, datosPostventaAlGanar, esEtapaPostventa } from "./postventa";

const AHORA = new Date("2026-09-24T12:00:00.000Z");
const en = (d: number) => new Date(AHORA.getTime() + d * 86_400_000);

describe("estadoRenovacion", () => {
  it("sin fecha (o inválida) no hay estado", () => {
    expect(estadoRenovacion(null, AHORA)).toBeNull();
    expect(estadoRenovacion("no-es-fecha", AHORA)).toBeNull();
  });
  it("clasifica vencida / próxima (≤30 días) / futura", () => {
    expect(estadoRenovacion(en(-5), AHORA)).toEqual({ tipo: "vencida", dias: 5 });
    expect(estadoRenovacion(en(10), AHORA)).toEqual({ tipo: "proxima", dias: 10 });
    expect(estadoRenovacion(en(30), AHORA)).toEqual({ tipo: "proxima", dias: 30 });
    expect(estadoRenovacion(en(45), AHORA)).toEqual({ tipo: "futura", dias: 45 });
  });
});

describe("renovacionPendiente", () => {
  const base = { postventaEtapa: "SEGUIMIENTO" as const, fechaRenovacion: en(10) };
  it("próxima o vencida y sin renovación creada → pendiente", () => {
    expect(renovacionPendiente(base, AHORA)).toBe(true);
    expect(renovacionPendiente({ ...base, fechaRenovacion: en(-3) }, AHORA)).toBe(true);
  });
  it("no es pendiente si falta mucho, no tiene fecha, ya se creó la renovación o está cerrado", () => {
    expect(renovacionPendiente({ ...base, fechaRenovacion: en(60) }, AHORA)).toBe(false);
    expect(renovacionPendiente({ ...base, fechaRenovacion: null }, AHORA)).toBe(false);
    expect(renovacionPendiente({ ...base, tieneRenovacion: true }, AHORA)).toBe(false);
    expect(renovacionPendiente({ ...base, postventaEtapa: "CERRADO" }, AHORA)).toBe(false);
  });
  it("fuera de postventa nunca es pendiente", () => {
    expect(renovacionPendiente({ ...base, postventaEtapa: null }, AHORA)).toBe(false);
  });
});

describe("datosPostventaAlGanar", () => {
  it("con el módulo activo, un negocio nuevo en postventa entra en Entrega", () => {
    expect(datosPostventaAlGanar(true, null)).toEqual({ postventaEtapa: "ENTREGA" });
  });
  it("no toca un negocio que ya está en postventa, ni nada si el módulo está apagado", () => {
    expect(datosPostventaAlGanar(true, "SEGUIMIENTO")).toEqual({});
    expect(datosPostventaAlGanar(false, null)).toEqual({});
  });
});

it("esEtapaPostventa valida las claves", () => {
  expect(esEtapaPostventa("ENTREGA")).toBe(true);
  expect(esEtapaPostventa("GANADA")).toBe(false);
  expect(esEtapaPostventa(undefined)).toBe(false);
});
