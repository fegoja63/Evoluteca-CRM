import { describe, it, expect } from "vitest";
import { fechaEfectiva, diaColombia } from "./fecha-efectiva";

/** Día de calendario que representa el resultado (siempre mediodía UTC). */
const dia = (d: Date) => d.toISOString().slice(0, 10);

describe("fechaEfectiva", () => {
  it("usa fechaCierre cuando está disponible", () => {
    const o = { fechaCierre: new Date("2026-02-10"), fechaEvento: new Date("2026-03-01"), creadoEn: new Date("2026-01-01") };
    expect(dia(fechaEfectiva(o))).toBe("2026-02-10");
  });

  it("usa fechaEvento si no hay fechaCierre", () => {
    const o = { fechaCierre: null, fechaEvento: new Date("2026-03-01"), creadoEn: new Date("2026-01-01") };
    expect(dia(fechaEfectiva(o))).toBe("2026-03-01");
  });

  it("usa creadoEn si no hay fechaCierre ni fechaEvento", () => {
    const o = { creadoEn: new Date("2026-01-01") };
    expect(dia(fechaEfectiva(o))).toBe("2026-01-01");
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
    const o = { creadoEn: new Date("2026-01-01"), extras: { MES: "2026-02-01T00:00:00.000Z" } };
    expect(fechaEfectiva(o).getMonth()).toBe(1); // febrero
  });

  it("ignora extras.MES si el valor no es una fecha válida", () => {
    const o = { fechaCierre: new Date("2026-02-10"), creadoEn: new Date("2026-01-01"), extras: { MES: "no-es-fecha" } };
    expect(dia(fechaEfectiva(o))).toBe("2026-02-10");
  });

  it("devuelve el mediodía UTC: el mismo día en el servidor (UTC), en Bogotá y en el navegador", () => {
    const f = fechaEfectiva({ creadoEn: new Date("2026-01-01"), extras: { MES: "2026-09-01T00:00:00.000Z" } });
    expect(f.toISOString()).toBe("2026-09-01T12:00:00.000Z");
  });

  // Regresión del resumen mensual de octubre 2026 (Teatro Belarte): una venta
  // importada de ENERO se comparaba contra la ventana del año anclada a Bogotá
  // (1-ene 05:00 UTC) y, en el servidor en UTC, caía en el año anterior.
  it("una venta importada de enero cae dentro del año, con ventanas de Bogotá o del servidor", () => {
    const f = fechaEfectiva({ creadoEn: new Date("2026-03-01"), extras: { MES: "2026-01-01T00:00:00.000Z" } });
    const inicioAnioBogota = new Date(Date.UTC(2026, 0, 1, 5));
    const inicioAnioServidorUtc = new Date(Date.UTC(2026, 0, 1, 0));
    expect(f >= inicioAnioBogota).toBe(true);
    expect(f >= inicioAnioServidorUtc).toBe(true);
    expect(f < new Date(Date.UTC(2026, 1, 1, 0))).toBe(true);
  });

  it("una venta cerrada a las 8 p.m. del último día del mes en Colombia cuenta en ese mes", () => {
    // 30-sep 20:00 en Bogotá = 1-oct 01:00 UTC: en el servidor (UTC) ya era octubre.
    const o = { fechaCierre: new Date("2026-10-01T01:00:00Z"), creadoEn: new Date("2026-08-01") };
    expect(dia(fechaEfectiva(o))).toBe("2026-09-30");
  });

  it("una fecha de formulario anclada a Bogotá (05:00 UTC) se queda en su día", () => {
    const o = { fechaCierre: new Date("2026-10-01T05:00:00Z"), creadoEn: new Date("2026-08-01") };
    expect(dia(fechaEfectiva(o))).toBe("2026-10-01");
  });
});

describe("diaColombia", () => {
  it("lee los instantes en hora de Bogotá", () => {
    expect(diaColombia(new Date("2026-10-01T04:59:59.123Z"))).toEqual({ anio: 2026, mes: 8, dia: 30 });
    expect(diaColombia(new Date("2026-10-01T05:00:00.001Z"))).toEqual({ anio: 2026, mes: 9, dia: 1 });
  });

  it("respeta los 'solo día' guardados a medianoche UTC (Excel, formularios viejos)", () => {
    expect(diaColombia(new Date("2026-10-01T00:00:00.000Z"))).toEqual({ anio: 2026, mes: 9, dia: 1 });
  });
});
