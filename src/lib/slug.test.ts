import { describe, it, expect } from "vitest";
import { generarSlug, generarSlugUnico } from "./slug";

describe("generarSlug", () => {
  it("pone todo en minúsculas y separa por guiones", () => {
    expect(generarSlug("Teatro Belarte")).toBe("teatro-belarte");
  });
  it("elimina tildes y ñ", () => {
    expect(generarSlug("Compañía Artística")).toBe("compania-artistica");
  });
  it("elimina caracteres especiales", () => {
    expect(generarSlug("D&G Abogados S.A.S.")).toBe("dg-abogados-sas");
  });
  it("colapsa espacios y guiones repetidos", () => {
    expect(generarSlug("  Hola   Mundo  ")).toBe("hola-mundo");
  });
});

describe("generarSlugUnico", () => {
  it("agrega un sufijo al slug base", () => {
    const slug = generarSlugUnico("Teatro Belarte");
    expect(slug).toMatch(/^teatro-belarte-[a-z0-9]{5}$/);
  });
  it("genera sufijos distintos en llamadas consecutivas", () => {
    const a = generarSlugUnico("Empresa");
    const b = generarSlugUnico("Empresa");
    expect(a).not.toBe(b);
  });
});
