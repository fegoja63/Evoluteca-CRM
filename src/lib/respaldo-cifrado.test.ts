import { describe, it, expect, beforeAll } from "vitest";
import { cifrar, descifrar, hayClaveRespaldo } from "@/lib/respaldo-cifrado";

// Clave de prueba (32 bytes en hex). No es la de producción.
const CLAVE_TEST = "0".repeat(64);

beforeAll(() => {
  process.env.RESPALDO_CLAVE = CLAVE_TEST;
});

describe("respaldo-cifrado", () => {
  it("cifra y descifra de ida y vuelta (round-trip)", () => {
    const original = Buffer.from("datos de respaldo — áéí ñ 💾", "utf8");
    const paquete = cifrar(original);
    expect(paquete.equals(original)).toBe(false); // realmente cifró
    expect(descifrar(paquete).equals(original)).toBe(true);
  });

  it("cada cifrado usa un IV distinto (no es determinista)", () => {
    const datos = Buffer.from("mismo contenido");
    expect(cifrar(datos).equals(cifrar(datos))).toBe(false);
  });

  it("detecta manipulación del archivo cifrado", () => {
    const paquete = cifrar(Buffer.from("intacto"));
    paquete[paquete.length - 1] ^= 0xff; // altera un byte
    expect(() => descifrar(paquete)).toThrow();
  });

  it("hayClaveRespaldo refleja la configuración", () => {
    expect(hayClaveRespaldo()).toBe(true);
    const previa = process.env.RESPALDO_CLAVE;
    process.env.RESPALDO_CLAVE = "corta";
    expect(hayClaveRespaldo()).toBe(false);
    process.env.RESPALDO_CLAVE = previa;
  });
});
