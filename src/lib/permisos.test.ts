import { describe, it, expect } from "vitest";
import { puedeEliminar, esComercial, filtroOwner, moduloActivo } from "./permisos";

describe("puedeEliminar", () => {
  it("permite a ADMINISTRADOR y GERENTE", () => {
    expect(puedeEliminar("ADMINISTRADOR")).toBe(true);
    expect(puedeEliminar("GERENTE")).toBe(true);
  });
  it("no permite a COMERCIAL ni a undefined", () => {
    expect(puedeEliminar("COMERCIAL")).toBe(false);
    expect(puedeEliminar(undefined)).toBe(false);
  });
});

describe("esComercial", () => {
  it("identifica el rol COMERCIAL", () => {
    expect(esComercial("COMERCIAL")).toBe(true);
    expect(esComercial("ADMINISTRADOR")).toBe(false);
  });
});

describe("filtroOwner", () => {
  it("filtra por creadoBy solo para COMERCIAL", () => {
    expect(filtroOwner("COMERCIAL", "user-1")).toEqual({ creadoBy: "user-1" });
  });
  it("no filtra para ADMINISTRADOR ni GERENTE", () => {
    expect(filtroOwner("ADMINISTRADOR", "user-1")).toEqual({});
    expect(filtroOwner("GERENTE", "user-1")).toEqual({});
  });
});

describe("moduloActivo", () => {
  it("detecta un módulo activo", () => {
    expect(moduloActivo({ salones: true }, "salones")).toBe(true);
  });
  it("detecta un módulo inactivo o ausente", () => {
    expect(moduloActivo({ salones: false }, "salones")).toBe(false);
    expect(moduloActivo({}, "salones")).toBe(false);
  });
  it("es robusto ante modulos null/no-objeto", () => {
    expect(moduloActivo(null, "salones")).toBe(false);
    expect(moduloActivo("no-es-objeto", "salones")).toBe(false);
    expect(moduloActivo(undefined, "salones")).toBe(false);
  });
});
