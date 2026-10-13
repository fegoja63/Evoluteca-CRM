/**
 * Copia de los resúmenes (src/lib/copia-resumen.ts): solo el admin del demo se
 * desvía a la copia, y solo si la variable de destino está configurada.
 */
import { describe, it, expect, afterEach } from "vitest";
import { destinoCopia, USUARIO_COPIA } from "@/lib/copia-resumen";

const original = process.env.RESUMEN_COPIA_A;
afterEach(() => {
  if (original === undefined) delete process.env.RESUMEN_COPIA_A;
  else process.env.RESUMEN_COPIA_A = original;
});

describe("copia de los resúmenes", () => {
  it("sin la variable configurada no hay copia", () => {
    delete process.env.RESUMEN_COPIA_A;
    expect(destinoCopia(USUARIO_COPIA)).toBeNull();
  });

  it("con la variable, el admin del demo va a la copia y nadie más", () => {
    process.env.RESUMEN_COPIA_A = " copia@evoluteca.test ";
    expect(destinoCopia(USUARIO_COPIA)).toBe("copia@evoluteca.test");
    expect(destinoCopia("rafael@oltc.co")).toBeNull();
    expect(destinoCopia(null)).toBeNull();
  });
});
