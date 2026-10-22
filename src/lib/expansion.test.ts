import { describe, expect, it } from "vitest";
import { limpiarExpansionIA, senalesDeMomento, type Compra } from "./expansion";

// Viernes 9 de octubre de 2026, 10:00 a. m. en Bogotá (UTC-5).
const AHORA = new Date("2026-10-09T15:00:00Z");
const dia = (iso: string) => new Date(`${iso}T00:00:00Z`); // fecha de calendario
const compra = (cierre: string, extra: Partial<Compra> = {}): Compra => ({ titulo: "Plan anual", valor: 1000, fechaCierre: dia(cierre), ...extra });
const tipos = (c: Compra[], ahora = AHORA) => senalesDeMomento(c, ahora).map(s => s.tipo);

describe("senalesDeMomento", () => {
  it("sin compras no hay señales", () => {
    expect(senalesDeMomento([], AHORA)).toEqual([]);
  });

  it("avisa la renovación más cercana dentro de 120 días", () => {
    const s = senalesDeMomento([
      compra("2026-05-01", { titulo: "Lejana", fechaRenovacion: dia("2027-03-01") }),
      compra("2026-06-01", { titulo: "Cercana", fechaRenovacion: dia("2026-11-08") }),
    ], AHORA);
    expect(s).toEqual([{ tipo: "RENOVACION", texto: '"Cercana" se renueva en 30 días' }]);
  });

  it("no avisa renovaciones ya pasadas", () => {
    expect(tipos([compra("2026-05-01", { fechaRenovacion: dia("2026-10-01") })])).toEqual([]);
  });

  it("la renovación de hoy cuenta aunque en UTC ya sea mañana", () => {
    const noche = new Date("2026-10-10T03:30:00Z"); // 9 oct, 10:30 p. m. Bogotá
    const s = senalesDeMomento([compra("2026-05-01", { titulo: "Hoy", fechaRenovacion: dia("2026-10-09") })], noche);
    expect(s[0]).toEqual({ tipo: "RENOVACION", texto: '"Hoy" se renueva hoy' });
  });

  it("detecta una recompra vencida según el ritmo habitual (mediana)", () => {
    // Compra cada ~90 días; la última fue hace 101.
    const s = senalesDeMomento([compra("2026-01-01"), compra("2026-04-01"), compra("2026-06-30")], AHORA);
    expect(s).toEqual([{ tipo: "RECOMPRA", texto: "Suele comprar cada ~90 días y su última compra fue hace 101" }]);
  });

  it("con menos de 3 compras no estima ritmo", () => {
    expect(tipos([compra("2026-01-01"), compra("2026-04-01")])).toEqual([]);
  });

  it("avisa un cliente inactivo hace un año o más", () => {
    expect(tipos([compra("2025-10-01")])).toEqual(["INACTIVO"]);
    expect(tipos([compra("2025-10-20")])).toEqual([]);
  });
});

describe("limpiarExpansionIA", () => {
  it("recorta, descarta valores inválidos y deja máximo 3", () => {
    const s = (titulo: string, valorEstimado: number | null) => ({ tipo: "COMPLEMENTARIO" as const, titulo, razon: " r ", valorEstimado });
    const r = limpiarExpansionIA({ sugerencias: [s(" A ", 1234.6), s("", 1), s("B", -5), s("C", null), s("D", 10)] });
    expect(r.sugerencias.map(x => [x.titulo, x.valorEstimado])).toEqual([["A", 1235], ["B", null], ["C", null]]);
    expect(r.sugerencias[0].razon).toBe("r");
  });
});
