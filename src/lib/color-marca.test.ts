import { describe, it, expect } from "vitest";
import { normalizarColorMarca, paletaMarca, contraste, PALETA_EVOLUTECA } from "./color-marca";

describe("normalizarColorMarca", () => {
  it("acepta #RRGGBB y RRGGBB, en minúsculas", () => {
    expect(normalizarColorMarca("#DC2626")).toBe("#dc2626");
    expect(normalizarColorMarca(" dc2626 ")).toBe("#dc2626");
  });

  it("rechaza vacío, formatos cortos, nombres y no-strings", () => {
    for (const v of ["", "#fff", "red", "#12345g", "rgb(0,0,0)", null, undefined, 123]) {
      expect(normalizarColorMarca(v)).toBeNull();
    }
  });
});

describe("paletaMarca", () => {
  it("sin color devuelve exactamente la paleta azul de siempre", () => {
    expect(paletaMarca(null)).toEqual(PALETA_EVOLUTECA);
    expect(paletaMarca("")).toEqual(PALETA_EVOLUTECA);
    expect(paletaMarca("inválido")).toEqual(PALETA_EVOLUTECA);
  });

  it("un color oscuro se respeta tal cual", () => {
    const p = paletaMarca("#7f1d1d");
    expect(p.principal).toBe("#7f1d1d");
    expect(p.oscuro).toBe("#7f1d1d");
  });

  it("un color muy claro se oscurece hasta que el texto blanco sea legible", () => {
    const p = paletaMarca("#fde047"); // amarillo
    expect(p.principal).toBe("#fde047");
    expect(p.oscuro).not.toBe("#fde047");
    expect(contraste(p.oscuro, "#ffffff")).toBeGreaterThanOrEqual(5);
  });

  it("en cualquier color, el texto de marca y el badge son legibles", () => {
    for (const c of ["#ffffff", "#000000", "#22c55e", "#f97316", "#0ea5e9", "#a855f7", "#dc2626"]) {
      const p = paletaMarca(c);
      expect(contraste(p.oscuro, "#ffffff")).toBeGreaterThanOrEqual(5);
      expect(contraste(p.texto, "#ffffff")).toBeGreaterThanOrEqual(5);
      expect(contraste(p.textoSobreClaro, p.claro)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.sobreOscuro, p.oscuro)).toBeGreaterThanOrEqual(2.5);
    }
  });
});
