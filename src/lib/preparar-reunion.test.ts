import { describe, it, expect } from "vitest";
import { esPreparable, limpiarPrepararReunion } from "./preparar-reunion";

describe("preparar reunión", () => {
  it("solo reuniones y visitas se preparan", () => {
    expect(esPreparable("REUNION")).toBe(true);
    expect(esPreparable("VISITA_COMERCIAL")).toBe(true);
    expect(esPreparable("LLAMADA")).toBe(false);
    expect(esPreparable("TAREA")).toBe(false);
  });

  it("recorta textos, descarta lo vacío y respeta los máximos", () => {
    const p = limpiarPrepararReunion({
      objetivo: " Acordar la demo. ",
      agenda: [1, 2, 3, 4].map(i => ({ punto: ` Punto  ${i} `, porque: "x" })).concat([{ punto: " ", porque: "y" }]),
      participantes: [{ persona: " Ana ", porque: "Decide." }, { persona: "", porque: "nada" }],
      preguntas: ["a", " ", "b", "c", "d", "e", "f"],
      llevar: ["Propuesta", "", "Caso", "Cifras", "Demo", "Otro"],
      invitacion: { asunto: "  Reunión   de seguimiento ", cuerpo: " Buenos días. " },
    });
    expect(p.objetivo).toBe("Acordar la demo.");
    expect(p.agenda.map(a => a.punto)).toEqual(["Punto 1", "Punto 2", "Punto 3"]);
    expect(p.participantes).toEqual([{ persona: "Ana", porque: "Decide." }]);
    expect(p.preguntas).toEqual(["a", "b", "c", "d", "e"]);
    expect(p.llevar).toEqual(["Propuesta", "Caso", "Cifras", "Demo"]);
    expect(p.invitacion).toEqual({ asunto: "Reunión de seguimiento", cuerpo: "Buenos días." });
  });
});
