import { describe, it, expect } from "vitest";
import { fechaEfectiva } from "./fecha-efectiva";

describe("fechaEfectiva", () => {
  it("usa fechaCierre cuando está disponible", () => {
    const o = { fechaCierre: new Date("2026-02-10"), fechaEvento: new Date("2026-03-01"), creadoEn: new Date("2026-01-01") };
    expect(fechaEfectiva(o).getTime()).toBe(new Date("2026-02-10").getTime());
  });

  it("usa fechaEvento si no hay fechaCierre", () => {
    const o = { fechaCierre: null, fechaEvento: new Date("2026-03-01"), creadoEn: new Date("2026-01-01") };
    expect(fechaEfectiva(o).getTime()).toBe(new Date("2026-03-01").getTime());
  });

  it("usa creadoEn si no hay fechaCierre ni fechaEvento", () => {
    const o = { creadoEn: new Date("2026-01-01") };
    expect(fechaEfectiva(o).getTime()).toBe(new Date("2026-01-01").getTime());
  });

  it("prioriza extras.MES sobre todo lo demás", () => {
    const o = {
      fechaCierre: new Date("2026-02-10"),
      creadoEn: new Date("2026-01-01"),
      extras: { MES: "2026-06-01T00:00:00.000Z" },
    };
    const resultado = fechaEfectiva(o);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(5); // junio, 0-indexado
  });

  it("no corre extras.MES un mes atrás en timezones detrás de UTC", () => {
    // Esta es la regresión específica documentada en el código fuente:
    // leer "2026-02-01T00:00:00Z" con getMonth()/getFullYear() (hora local)
    // en un timezone UTC-5 lo interpretaría como 31 de enero, no 1 de febrero.
    const o = { creadoEn: new Date("2026-01-01"), extras: { MES: "2026-02-01T00:00:00.000Z" } };
    expect(fechaEfectiva(o).getMonth()).toBe(1); // febrero
  });

  it("ignora extras.MES si el valor no es una fecha válida", () => {
    const o = { fechaCierre: new Date("2026-02-10"), creadoEn: new Date("2026-01-01"), extras: { MES: "no-es-fecha" } };
    expect(fechaEfectiva(o).getTime()).toBe(new Date("2026-02-10").getTime());
  });
});
