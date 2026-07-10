import { describe, it, expect, vi, afterEach } from "vitest";
import { plazoVencido, plazoProximo, diasHastaPlazo } from "./plazo-legal";

// Colombia es UTC-5. Estas pruebas fijan la hora del sistema para que el
// resultado no dependa de cuándo se corran — la lógica de esta librería
// existe justamente para evitar que un plazo se marque "vencido" hasta 5
// horas antes de que termine el día en Colombia (ver comentario en el
// archivo fuente), así que las pruebas cubren ese caso específico.
afterEach(() => {
  vi.useRealTimers();
});

describe("plazoVencido", () => {
  it("no marca vencido un plazo de hoy mismo, incluso tarde en el día UTC", () => {
    // 2026-03-10 23:00 UTC == 2026-03-10 18:00 hora Colombia — sigue siendo "hoy".
    vi.setSystemTime(new Date("2026-03-10T23:00:00.000Z"));
    expect(plazoVencido("2026-03-10T00:00:00.000Z")).toBe(false);
  });

  it("marca vencido un plazo de ayer", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(plazoVencido("2026-03-09T00:00:00.000Z")).toBe(true);
  });

  it("no marca vencido un plazo de mañana", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(plazoVencido("2026-03-11T00:00:00.000Z")).toBe(false);
  });

  it("la medianoche UTC del día siguiente todavía es 'hoy' en Colombia", () => {
    // 2026-03-11T00:00:00Z es 2026-03-10 19:00 hora Colombia — el plazo del
    // 10 de marzo NO debería estar vencido en este instante.
    vi.setSystemTime(new Date("2026-03-11T00:00:00.000Z"));
    expect(plazoVencido("2026-03-10T00:00:00.000Z")).toBe(false);
  });
});

describe("diasHastaPlazo", () => {
  it("devuelve 0 para un plazo de hoy", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(diasHastaPlazo("2026-03-10T00:00:00.000Z")).toBe(0);
  });
  it("devuelve positivo para un plazo futuro", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(diasHastaPlazo("2026-03-15T00:00:00.000Z")).toBe(5);
  });
  it("devuelve negativo para un plazo pasado", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(diasHastaPlazo("2026-03-05T00:00:00.000Z")).toBe(-5);
  });
});

describe("plazoProximo", () => {
  it("es falso para un plazo ya vencido", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(plazoProximo("2026-03-05T00:00:00.000Z", 7)).toBe(false);
  });
  it("es verdadero dentro de la ventana de días", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(plazoProximo("2026-03-14T00:00:00.000Z", 7)).toBe(true);
  });
  it("es falso fuera de la ventana de días", () => {
    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));
    expect(plazoProximo("2026-03-25T00:00:00.000Z", 7)).toBe(false);
  });
});
