import { describe, it, expect } from "vitest";
import { analisisATexto, limpiarAnalisis } from "./analisis-cliente";

describe("análisis del negocio del cliente", () => {
  it("recorta, descarta lo vacío y respeta los máximos", () => {
    const a = limpiarAnalisis({
      situacion: " Crece 10 % al año. ",
      desafios: ["a", " ", "b", "c", "d", "e"],
      objetivos: ["Expandirse"],
      plazo: "  ",
      exito: " EBITDA 20 % ",
      dondeAyudar: ["x", "y", "z", "w"],
      preguntas: [],
    });
    expect(a).toEqual({
      situacion: "Crece 10 % al año.", desafios: ["a", "b", "c", "d"], objetivos: ["Expandirse"],
      plazo: null, exito: "EBITDA 20 %", dondeAyudar: ["x", "y", "z"], preguntas: [],
    });
  });

  it("lo pasa a texto para el contexto de otras funciones, sin las preguntas", () => {
    const t = analisisATexto({
      situacion: "Crece.", desafios: ["Costos"], objetivos: [], plazo: "2027", exito: null,
      dondeAyudar: ["Auditoría"], preguntas: ["¿Presupuesto?"], fuentes: "informe.pdf", actualizadoEn: new Date("2026-10-27T15:00:00Z"),
    }).join("\n");
    expect(t).toContain("ANÁLISIS DEL NEGOCIO DEL CLIENTE (de informe.pdf");
    expect(t).toContain("Desafíos: Costos");
    expect(t).toContain("Plazo: 2027");
    expect(t).toContain("Dónde podemos ayudar: Auditoría");
    expect(t).not.toContain("Objetivos:");
  });
});
