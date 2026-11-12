import { describe, it, expect } from "vitest";
import { esVisitaNueva, VENTANA_VISITA_MS } from "./cotizacion-vista";
import { insigniaVista, SEGUIMIENTO_VISTAS_DESDE } from "./cotizacion-vista-texto";

describe("esVisitaNueva", () => {
  const ahora = new Date("2026-11-12T15:00:00Z");
  it("la primera apertura siempre es visita nueva", () => {
    expect(esVisitaNueva(null, ahora)).toBe(true);
  });
  it("dentro de la ventana es la misma visita; después, una nueva", () => {
    expect(esVisitaNueva(new Date(ahora.getTime() - 60_000), ahora)).toBe(false);
    expect(esVisitaNueva(new Date(ahora.getTime() - VENTANA_VISITA_MS), ahora)).toBe(true);
  });
});

describe("insigniaVista", () => {
  const reciente = new Date(SEGUIMIENTO_VISTAS_DESDE.getTime() + 3600_000).toISOString();
  it("muestra cuántas veces la abrió", () => {
    expect(insigniaVista({ estado: "ENVIADA", vistas: 3, vistaUltimaEn: reciente, creadoEn: reciente })?.texto).toBe("Vista 3×");
    expect(insigniaVista({ estado: "ACEPTADA", vistas: 1, vistaUltimaEn: reciente })?.texto).toBe("Vista");
  });
  it("'Sin abrir' solo para enviadas con enlace creadas desde que existe el seguimiento", () => {
    expect(insigniaVista({ estado: "ENVIADA", tokenPublico: "t", vistas: 0, creadoEn: reciente })?.texto).toBe("Sin abrir");
    expect(insigniaVista({ estado: "ENVIADA", tokenPublico: "t", vistas: 0, creadoEn: "2026-10-01T12:00:00Z" })).toBeNull();
    expect(insigniaVista({ estado: "ENVIADA", tokenPublico: null, vistas: 0, creadoEn: reciente })).toBeNull();
    expect(insigniaVista({ estado: "BORRADOR", tokenPublico: "t", vistas: 0, creadoEn: reciente })).toBeNull();
  });
});
