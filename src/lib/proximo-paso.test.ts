import { describe, expect, it } from "vitest";
import { elegirProximoPaso, etiquetaProximoPaso } from "./proximo-paso";

// Jueves 9 de octubre de 2026, 10:00 a. m. en Bogotá (UTC-5).
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
