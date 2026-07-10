import { describe, it, expect } from "vitest";
import { crearOportunidadSchema } from "./oportunidades";

describe("crearOportunidadSchema", () => {
  it("acepta el mínimo indispensable", () => {
    const r = crearOportunidadSchema.parse({ titulo: "Negocio nuevo" });
    expect(r.titulo).toBe("Negocio nuevo");
  });

  it("rechaza sin título", () => {
    expect(() => crearOportunidadSchema.parse({})).toThrow();
  });

  it("rechaza un valor negativo", () => {
    expect(() => crearOportunidadSchema.parse({ titulo: "XX", valor: -100 })).toThrow();
  });

  it("rechaza probabilidad fuera de 0-100", () => {
    expect(() => crearOportunidadSchema.parse({ titulo: "XX", probabilidad: 150 })).toThrow();
  });

  it("rechaza una etapa que no existe en el enum", () => {
    expect(() => crearOportunidadSchema.parse({ titulo: "XX", etapa: "INVENTADA" })).toThrow();
  });

  // Regresión encontrada en vivo: un formulario que deja "valor"/"probabilidad"
  // en blanco manda "" — antes del fix esto se guardaba como 0 en vez de
  // quedar sin valor / usar el default.
  it("trata los campos numéricos vacíos ('') como ausentes, no como 0", () => {
    const r = crearOportunidadSchema.parse({ titulo: "XX", valor: "", probabilidad: "", empresaId: "", fechaEvento: "" });
    expect(r.valor).toBeUndefined();
    expect(r.probabilidad).toBeUndefined();
    expect(r.empresaId).toBe("");
    expect(r.fechaEvento).toBe("");
  });

  it("acepta un valor y probabilidad reales", () => {
    const r = crearOportunidadSchema.parse({ titulo: "XX", valor: 5_000_000, probabilidad: 75 });
    expect(r.valor).toBe(5_000_000);
    expect(r.probabilidad).toBe(75);
  });
});
