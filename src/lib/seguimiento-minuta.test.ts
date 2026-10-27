import { describe, it, expect } from "vitest";
import { contarPalabras, limpiarSeguimiento } from "./seguimiento-minuta";

describe("correo de seguimiento", () => {
  it("limpia el asunto y los saltos de línea de más", () => {
    expect(limpiarSeguimiento({ asunto: " Asunto:  Seguimiento   reunión ", cuerpo: "Hola.\n\n\n\nGracias.\n" }))
      .toEqual({ asunto: "Seguimiento reunión", cuerpo: "Hola.\n\nGracias." });
  });

  it("cuenta palabras", () => {
    expect(contarPalabras("  Estimada  Ana,\n\nle escribo ")).toBe(4);
    expect(contarPalabras("")).toBe(0);
  });
});
