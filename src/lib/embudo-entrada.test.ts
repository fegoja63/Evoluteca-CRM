import { describe, it, expect } from "vitest";
import { nivelAlcanzado, calcularEmbudo, tasaPaso } from "./embudo-entrada";

describe("nivelAlcanzado", () => {
  it("toma la etapa más avanzada, aunque hoy esté perdida", () => {
    expect(nivelAlcanzado("PERDIDA", ["CALIFICADO", "PROPUESTA", "PERDIDA"])).toBe(2);
    expect(nivelAlcanzado("PROSPECTO", [])).toBe(0);
    expect(nivelAlcanzado("GANADA", [])).toBe(4);
    // Si alguien la devolvió de etapa, cuenta lo más lejos que llegó.
    expect(nivelAlcanzado("CALIFICADO", ["NEGOCIACION", "CALIFICADO"])).toBe(3);
  });
});

describe("calcularEmbudo", () => {
  it("cuenta oportunidades y conversaciones del chat sin datos como consultas", () => {
    const e = calcularEmbudo(
      [
        { etapa: "PROSPECTO", historial: [] },
        { etapa: "CALIFICADO", historial: ["CALIFICADO"] },
        { etapa: "PERDIDA", historial: ["CALIFICADO", "PROPUESTA", "PERDIDA"] },
        { etapa: "GANADA", historial: ["CALIFICADO", "PROPUESTA", "GANADA"] },
      ],
      [{ oportunidadId: null }, { oportunidadId: null }, { oportunidadId: "op-1" }],
    );
    expect(e).toEqual({
      consultas: 6, calificados: 3, propuestas: 2, ventas: 1,
      chat: { conversaciones: 3, conDatos: 1 },
    });
  });

  it("sin nada entra en ceros", () => {
    expect(calcularEmbudo([], [])).toEqual({ consultas: 0, calificados: 0, propuestas: 0, ventas: 0, chat: { conversaciones: 0, conDatos: 0 } });
  });
});

describe("tasaPaso", () => {
  it("% sobre el paso anterior; sin anterior no hay tasa", () => {
    expect(tasaPaso(1, 3)).toBe(33);
    expect(tasaPaso(0, 0)).toBeNull();
  });
});
