import { describe, it, expect } from "vitest";
import { normalizarCuerpo, seccionesCotizacion, seccionesVisibles, CONDICIONES_DEFAULT } from "./cuerpo-cotizacion";

const plantillaTenant = [
  { titulo: "Sobre nosotros", contenido: "Somos X" },
  { titulo: "Condiciones comerciales", contenido: "Genéricas" },
];

describe("normalizarCuerpo", () => {
  it("descarta lo que no es array o secciones vacías", () => {
    expect(normalizarCuerpo(null)).toEqual([]);
    expect(normalizarCuerpo("x")).toEqual([]);
    expect(normalizarCuerpo([{ titulo: "", contenido: "" }])).toEqual([]);
  });
  it("recorta y conserva secciones con contenido", () => {
    expect(normalizarCuerpo([{ titulo: " A ", contenido: " B " }])).toEqual([{ titulo: "A", contenido: "B" }]);
  });
});

describe("seccionesCotizacion", () => {
  it("usa el cuerpo del tenant si está configurado", () => {
    expect(seccionesCotizacion(plantillaTenant)).toEqual(plantillaTenant);
  });
  it("cae a las condiciones por defecto si no hay nada", () => {
    expect(seccionesCotizacion(null)).toEqual(CONDICIONES_DEFAULT);
  });
});

describe("seccionesVisibles", () => {
  it("sin condiciones propias, muestra todo el cuerpo del tenant", () => {
    const res = seccionesVisibles(plantillaTenant, false);
    expect(res.some(s => s.titulo === "Sobre nosotros")).toBe(true);
    expect(res.some(s => s.titulo === "Condiciones comerciales")).toBe(true);
  });
  it("con condiciones propias, oculta la sección genérica 'Condiciones comerciales'", () => {
    const res = seccionesVisibles(plantillaTenant, true);
    expect(res.some(s => s.titulo === "Sobre nosotros")).toBe(true);
    expect(res.some(s => s.titulo.toLowerCase() === "condiciones comerciales")).toBe(false);
  });
});
