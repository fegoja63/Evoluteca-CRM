import { describe, it, expect } from "vitest";
import { normalizarEmail, normalizarNombre, agruparDuplicados } from "./duplicados";

describe("normalizarEmail", () => {
  it("baja a minúsculas y recorta espacios", () => {
    expect(normalizarEmail("  Juan@Empresa.COM ")).toBe("juan@empresa.com");
  });
  it("devuelve cadena vacía cuando no hay correo", () => {
    expect(normalizarEmail(null)).toBe("");
    expect(normalizarEmail(undefined)).toBe("");
    expect(normalizarEmail("   ")).toBe("");
  });
});

describe("normalizarNombre", () => {
  it("quita acentos, baja a minúsculas y colapsa espacios", () => {
    expect(normalizarNombre("José  Pérez")).toBe("jose perez");
    expect(normalizarNombre("  ACME   S.A.  ")).toBe("acme s.a.");
  });
  it("ignora nombres demasiado cortos (< 3 caracteres)", () => {
    expect(normalizarNombre("Jo")).toBe("");
    expect(normalizarNombre("")).toBe("");
  });
});

type Reg = { id: string; email?: string | null; nombre: string };
const clavesContacto = (c: Reg) => [normalizarEmail(c.email), normalizarNombre(c.nombre)];

describe("agruparDuplicados", () => {
  it("agrupa por correo idéntico ignorando mayúsculas/espacios", () => {
    const items: Reg[] = [
      { id: "1", email: "a@x.com", nombre: "Ana" },
      { id: "2", email: " A@X.com ", nombre: "Ana Gómez" },
      { id: "3", email: "b@x.com", nombre: "Beto" },
    ];
    const racimos = agruparDuplicados(items, clavesContacto);
    expect(racimos).toHaveLength(1);
    expect(racimos[0].map((r) => r.id).sort()).toEqual(["1", "2"]);
  });

  it("agrupa por nombre normalizado aunque el correo difiera", () => {
    const items: Reg[] = [
      { id: "1", email: "uno@x.com", nombre: "José Pérez" },
      { id: "2", email: "dos@x.com", nombre: "jose perez" },
    ];
    const racimos = agruparDuplicados(items, clavesContacto);
    expect(racimos).toHaveLength(1);
    expect(racimos[0]).toHaveLength(2);
  });

  it("une en un solo racimo a quien comparte correo con uno y nombre con otro (transitividad)", () => {
    const items: Reg[] = [
      { id: "1", email: "comun@x.com", nombre: "Ana" },
      { id: "2", email: "comun@x.com", nombre: "Ana María López" },
      { id: "3", email: "otro@x.com", nombre: "Ana María López" },
    ];
    const racimos = agruparDuplicados(items, clavesContacto);
    expect(racimos).toHaveLength(1);
    expect(racimos[0].map((r) => r.id).sort()).toEqual(["1", "2", "3"]);
  });

  it("no agrupa registros sin señal en común", () => {
    const items: Reg[] = [
      { id: "1", email: "a@x.com", nombre: "Ana" },
      { id: "2", email: "b@x.com", nombre: "Beto" },
    ];
    expect(agruparDuplicados(items, clavesContacto)).toHaveLength(0);
  });

  it("dos registros sin correo NO se agrupan por el solo hecho de no tenerlo", () => {
    const items: Reg[] = [
      { id: "1", email: null, nombre: "Ana" },
      { id: "2", email: "", nombre: "Beto" },
    ];
    expect(agruparDuplicados(items, clavesContacto)).toHaveLength(0);
  });
});
