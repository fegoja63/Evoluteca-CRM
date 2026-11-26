import { describe, it, expect } from "vitest";
import { lunesDe, semanaValida, moverSemana, rangoSemana, textoSemana, cumplimiento, aConteo, conteoVacio } from "./actividad-semanal";

describe("semanas (Bogotá)", () => {
  it("el lunes de la semana, con la hora de Bogotá y no la del servidor", () => {
    // Miércoles 26 nov 2026, 10:00 Bogotá.
    expect(lunesDe(new Date("2026-11-26T15:00:00Z"))).toBe("2026-11-23");
    // Domingo 29 nov 22:00 en Bogotá ya es lunes 30 en UTC: sigue siendo la semana del 23.
    expect(lunesDe(new Date("2026-11-30T03:00:00Z"))).toBe("2026-11-23");
    // Lunes 30 nov 00:30 Bogotá: semana nueva.
    expect(lunesDe(new Date("2026-11-30T05:30:00Z"))).toBe("2026-11-30");
  });

  it("valida que sea una fecha real y que caiga en lunes", () => {
    expect(semanaValida("2026-11-23")).toBe(true);
    expect(semanaValida("2026-11-24")).toBe(false);
    expect(semanaValida("2026-02-30")).toBe(false);
    expect(semanaValida("23/11/2026")).toBe(false);
    expect(semanaValida(null)).toBe(false);
  });

  it("mueve semanas entre meses y años", () => {
    expect(moverSemana("2026-11-30", 1)).toBe("2026-12-07");
    expect(moverSemana("2026-12-28", 1)).toBe("2027-01-04");
    expect(moverSemana("2026-11-02", -1)).toBe("2026-10-26");
  });

  it("el rango va de lunes 00:00 a lunes siguiente 00:00 de Bogotá", () => {
    const { desde, hasta } = rangoSemana("2026-11-23");
    expect(desde.toISOString()).toBe("2026-11-23T05:00:00.000Z");
    expect(hasta.toISOString()).toBe("2026-11-30T05:00:00.000Z");
    expect(textoSemana("2026-11-23")).toBe("23 nov – 29 nov");
    expect(textoSemana("2026-12-28")).toBe("28 dic – 3 ene");
  });
});

describe("cumplimiento", () => {
  it("solo cuenta los indicadores con compromiso y topa cada uno en 100 %", () => {
    const r = cumplimiento(
      aConteo({ contactos: 30, llamadas: 10, propuestas: 2 }),
      aConteo({ contactos: 15, llamadas: 12, propuestas: 2, reuniones: 5 }),
    );
    expect(r.total).toBe(3);
    expect(r.cumplidos).toBe(2);
    expect(r.pct).toBe(83); // (50 + 100 + 100) / 3
    expect(r.indicadores.map(i => i.clave)).toEqual(["contactos", "llamadas", "propuestas"]);
  });

  it("sin compromiso no hay porcentaje", () => {
    expect(cumplimiento(conteoVacio(), aConteo({ llamadas: 4 })).pct).toBeNull();
  });

  it("limpia valores raros de la base", () => {
    expect(aConteo({ llamadas: -3, contactos: 2.6, negocios: null })).toEqual({ contactos: 3, negocios: 0, llamadas: 0, reuniones: 0, propuestas: 0 });
  });
});
