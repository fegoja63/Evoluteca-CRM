import { describe, expect, it } from "vitest";
import { elegirProximoPaso, etiquetaProximoPaso, fechaAtajo } from "./proximo-paso";

// Viernes 9 de octubre de 2026, 10:00 a. m. en Bogotá (UTC-5).
const AHORA = new Date("2026-10-09T15:00:00Z");
const bog = (iso: string) => new Date(`${iso}-05:00`);
const act = (iso: string, titulo = "x") => ({ fecha: bog(iso), tipo: "LLAMADA", titulo });

describe("elegirProximoPaso", () => {
  it("sin pendientes no hay próximo paso", () => {
    expect(elegirProximoPaso([], AHORA)).toBeNull();
  });

  it("elige la primera desde hoy, aunque ya haya pasado la hora", () => {
    const r = elegirProximoPaso([act("2026-10-20T09:00", "lejana"), act("2026-10-09T08:00", "hoy temprano"), act("2026-10-01T09:00", "vieja")], AHORA);
    expect(r).toMatchObject({ titulo: "hoy temprano", vencida: false });
  });

  it("si todas son de días anteriores, muestra la más reciente como vencida", () => {
    const r = elegirProximoPaso([act("2026-10-01T09:00", "vieja"), act("2026-10-06T09:00", "reciente")], AHORA);
    expect(r).toMatchObject({ titulo: "reciente", vencida: true });
  });

  it("de noche en Bogotá (ya es otro día en UTC) una tarea de hoy sigue siendo de hoy", () => {
    const nocheBogota = new Date("2026-10-10T03:30:00Z"); // 9 oct, 10:30 p. m. Bogotá
    const r = elegirProximoPaso([act("2026-10-09T18:00")], nocheBogota);
    expect(r?.vencida).toBe(false);
  });
});

describe("etiquetaProximoPaso", () => {
  it("hoy muestra la hora", () => {
    expect(etiquetaProximoPaso({ fecha: bog("2026-10-09T15:00"), vencida: false }, AHORA)).toMatch(/^Hoy 3:00/);
  });
  it("mañana", () => {
    expect(etiquetaProximoPaso({ fecha: bog("2026-10-10T09:00"), vencida: false }, AHORA)).toBe("Mañana");
  });
  it("dentro de la semana muestra el día", () => {
    expect(etiquetaProximoPaso({ fecha: bog("2026-10-13T09:00"), vencida: false }, AHORA)).toMatch(/^mar/);
  });
  it("más adelante muestra día y mes", () => {
    expect(etiquetaProximoPaso({ fecha: bog("2026-10-20T09:00"), vencida: false }, AHORA)).toMatch(/^20 oct/);
  });
  it("vencida dice hace cuántos días", () => {
    expect(etiquetaProximoPaso({ fecha: bog("2026-10-06T09:00"), vencida: true }, AHORA)).toBe("Vencida hace 3 d");
  });
});

describe("fechaAtajo (agendar desde el tablero, hora Bogotá)", () => {
  // AHORA = viernes 9 de octubre de 2026, 10:00 a. m. Bogotá
  it("hoy = la próxima hora en punto", () => {
    expect(fechaAtajo("hoy", AHORA)).toBe("2026-10-09T11:00");
  });
  it("hoy no se ofrece después de las 6 p. m.", () => {
    expect(fechaAtajo("hoy", new Date("2026-10-09T23:30:00Z"))).toBeNull(); // 6:30 p. m. Bogotá
  });
  it("mañana y en 3 días, a las 9:00", () => {
    expect(fechaAtajo("manana", AHORA)).toBe("2026-10-10T09:00");
    expect(fechaAtajo("en3", AHORA)).toBe("2026-10-12T09:00");
  });
  it("próximo lunes; si hoy es lunes, el de la semana siguiente", () => {
    expect(fechaAtajo("lunes", AHORA)).toBe("2026-10-12T09:00");
    expect(fechaAtajo("lunes", new Date("2026-10-12T15:00:00Z"))).toBe("2026-10-19T09:00");
  });
  it("de noche en Bogotá (ya es otro día en UTC) 'mañana' sigue siendo el día siguiente en Bogotá", () => {
    expect(fechaAtajo("manana", new Date("2026-10-10T03:30:00Z"))).toBe("2026-10-10T09:00"); // 9 oct 10:30 p. m.
  });
  it("cruza fin de mes", () => {
    expect(fechaAtajo("en3", new Date("2026-10-30T15:00:00Z"))).toBe("2026-11-02T09:00");
  });
});
