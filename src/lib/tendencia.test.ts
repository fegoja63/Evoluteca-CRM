import { describe, expect, it } from "vitest";
import { variacionPct, rangoMesAnteriorAlCorte, ultimosMeses } from "./tendencia";

describe("variacionPct", () => {
  it("calcula la variación redondeada", () => {
    expect(variacionPct(120, 100)).toBe(20);
    expect(variacionPct(50, 200)).toBe(-75);
    expect(variacionPct(100, 300)).toBe(-67);
  });

  it("sin base (anterior 0) no hay variación", () => {
    expect(variacionPct(500, 0)).toBeNull();
    expect(variacionPct(0, 0)).toBeNull();
  });
});

describe("rangoMesAnteriorAlCorte", () => {
  it("corta el mes anterior en el mismo día", () => {
    const { inicio, fin } = rangoMesAnteriorAlCorte(2026, 9, 9); // 9 de octubre
    expect(inicio).toEqual(new Date(2026, 8, 1));
    expect(fin).toEqual(new Date(2026, 8, 10)); // incluye todo el 9 de septiembre
  });

  it("si el mes anterior es más corto, corta en su último día", () => {
    const { inicio, fin } = rangoMesAnteriorAlCorte(2026, 2, 31); // 31 de marzo
    expect(inicio).toEqual(new Date(2026, 1, 1));
    expect(fin).toEqual(new Date(2026, 2, 1)); // febrero completo, no se sale a marzo
  });

  it("enero compara contra diciembre del año anterior", () => {
    const { inicio, fin } = rangoMesAnteriorAlCorte(2026, 0, 15);
    expect(inicio).toEqual(new Date(2025, 11, 1));
    expect(fin).toEqual(new Date(2025, 11, 16));
  });
});

describe("ultimosMeses", () => {
  it("devuelve n meses consecutivos terminando en el actual", () => {
    const r = ultimosMeses(2026, 1, 3); // febrero
    expect(r.map(x => x.inicio)).toEqual([new Date(2025, 11, 1), new Date(2026, 0, 1), new Date(2026, 1, 1)]);
    expect(r.at(-1)!.fin).toEqual(new Date(2026, 2, 1));
  });
});
