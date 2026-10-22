import { describe, expect, it } from "vitest";
import { AVISO_SIN_DECISOR, faltaQuienDecide, mapaATexto, sugerirRol } from "./decisores";

describe("sugerirRol", () => {
  it("cargos directivos deciden", () => {
    for (const c of ["Gerente General", "Directora Financiera", "CEO", "Rector", "Dueño", "Socia fundadora"]) {
      expect(sugerirRol(c)).toBe("DECIDE");
    }
  });

  it("cargos operativos usan", () => {
    for (const c of ["Coordinador de eventos", "Analista de compras", "Técnico de soporte", "Docente"]) {
      expect(sugerirRol(c)).toBe("USA");
    }
  });

  it("el resto (o sin cargo) influye", () => {
    expect(sugerirRol("Jefe de compras")).toBe("INFLUYE");
    expect(sugerirRol(null)).toBe("INFLUYE");
    expect(sugerirRol("")).toBe("INFLUYE");
  });

  it("no confunde palabras que contienen el cargo", () => {
    expect(sugerirRol("Gerencia de proyectos")).toBe("INFLUYE"); // "gerencia" no es "gerente"
  });
});

describe("faltaQuienDecide", () => {
  it("avisa en un negocio abierto sin nadie que decida, incluso sin mapa", () => {
    expect(faltaQuienDecide([], "PROPUESTA")).toBe(true);
    expect(faltaQuienDecide([{ rol: "INFLUYE" }, { rol: "USA" }], "CALIFICADO")).toBe(true);
  });

  it("no avisa si alguien decide o si el negocio ya se cerró", () => {
    expect(faltaQuienDecide([{ rol: "INFLUYE" }, { rol: "DECIDE" }], "PROPUESTA")).toBe(false);
    expect(faltaQuienDecide([], "GANADA")).toBe(false);
    expect(faltaQuienDecide([], "PERDIDA")).toBe(false);
  });

  it("el aviso dice 'quién decide'", () => {
    expect(AVISO_SIN_DECISOR).toBe("No has identificado quién decide");
  });
});

describe("mapaATexto", () => {
  it("describe cada persona con su papel y postura", () => {
    const t = mapaATexto([
      { rol: "DECIDE", postura: "A_FAVOR", contacto: { nombre: "Ana", cargo: "Gerente" } },
      { rol: "FRENA", postura: "EN_CONTRA", contacto: { nombre: "Luis", cargo: null } },
    ]);
    expect(t).toBe("- Ana (Gerente): Decide, a favor\n- Luis: Frena, en contra");
  });

  it("sin personas lo dice", () => {
    expect(mapaATexto([])).toBe("Sin mapa de decisores registrado.");
  });
});
