import { describe, it, expect } from "vitest";
import {
  slugCampo,
  validarValoresCampos,
  mezclarExtras,
  formatearValorCampo,
  type DefinicionCampo,
} from "./campos-personalizados";

const defs: DefinicionCampo[] = [
  { clave: "cp_competidor", etiqueta: "Competidor", tipo: "TEXTO", opciones: [], obligatorio: true },
  { clave: "cp_monto", etiqueta: "Monto tope", tipo: "NUMERO", opciones: [], obligatorio: false },
  { clave: "cp_cierre", etiqueta: "Fecha estimada", tipo: "FECHA", opciones: [], obligatorio: false },
  { clave: "cp_segmento", etiqueta: "Segmento", tipo: "LISTA", opciones: ["Gobierno", "Financiero"], obligatorio: false },
  { clave: "cp_decisor", etiqueta: "Es decisor", tipo: "BOOLEANO", opciones: [], obligatorio: false },
];

describe("slugCampo", () => {
  it("genera una clave estable con prefijo cp_ y sin acentos", () => {
    expect(slugCampo("N° de Licitación")).toBe("cp_n_de_licitacion");
    expect(slugCampo("Competidor")).toBe("cp_competidor");
  });

  it("nunca queda vacía", () => {
    expect(slugCampo("   ")).toBe("cp_campo");
    expect(slugCampo("!!!")).toBe("cp_campo");
  });
});

describe("validarValoresCampos", () => {
  it("acepta y normaliza un conjunto válido", () => {
    const r = validarValoresCampos(defs, {
      cp_competidor: "  Acme  ",
      cp_monto: "1500000",
      cp_cierre: "2026-09-01",
      cp_segmento: "Gobierno",
      cp_decisor: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valores.cp_competidor).toBe("Acme");
      expect(r.valores.cp_monto).toBe("1500000");
      expect(r.valores.cp_cierre).toBe("2026-09-01");
      expect(r.valores.cp_segmento).toBe("Gobierno");
      expect(r.valores.cp_decisor).toBe("true");
    }
  });

  it("exige los campos obligatorios", () => {
    const r = validarValoresCampos(defs, { cp_competidor: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Competidor/);
  });

  it("omite (no guarda) los opcionales vacíos", () => {
    const r = validarValoresCampos(defs, { cp_competidor: "Acme", cp_monto: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect("cp_monto" in r.valores).toBe(false);
  });

  it("rechaza un número inválido", () => {
    const r = validarValoresCampos(defs, { cp_competidor: "Acme", cp_monto: "abc" });
    expect(r.ok).toBe(false);
  });

  it("rechaza un valor fuera de las opciones de la lista", () => {
    const r = validarValoresCampos(defs, { cp_competidor: "Acme", cp_segmento: "Otro" });
    expect(r.ok).toBe(false);
  });

  it("rechaza una fecha con formato inválido", () => {
    const r = validarValoresCampos(defs, { cp_competidor: "Acme", cp_cierre: "01/09/2026" });
    expect(r.ok).toBe(false);
  });
});

describe("mezclarExtras", () => {
  it("preserva las llaves importadas y sobrescribe solo las gestionadas", () => {
    const existentes = { "COTIZACION NUMERO": "COT-1", cp_competidor: "Viejo", cp_monto: "10" };
    const merged = mezclarExtras(existentes, defs, { cp_competidor: "Nuevo" });
    expect(merged["COTIZACION NUMERO"]).toBe("COT-1"); // importado intacto
    expect(merged.cp_competidor).toBe("Nuevo");        // gestionado, actualizado
    expect("cp_monto" in merged).toBe(false);          // gestionado y ahora vacío → se limpia
  });
});

describe("formatearValorCampo", () => {
  it("da formato a Sí/No y números", () => {
    expect(formatearValorCampo("BOOLEANO", "true")).toBe("Sí");
    expect(formatearValorCampo("BOOLEANO", "false")).toBe("No");
    expect(formatearValorCampo("NUMERO", "1500000")).toBe("1.500.000");
    expect(formatearValorCampo("TEXTO", "")).toBe("—");
  });
});
