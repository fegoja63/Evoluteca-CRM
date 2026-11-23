import { describe, it, expect } from "vitest";
import { diasValidos, diasDesde, ultimoMovimiento, limpiarBorradores, envioSchema } from "./base-dormida";

describe("diasValidos", () => {
  it("acepta solo los plazos ofrecidos", () => {
    expect(diasValidos("180")).toBe(180);
    expect(diasValidos("7")).toBe(90);
    expect(diasValidos(null)).toBe(90);
  });
});

describe("ultimoMovimiento y diasDesde", () => {
  it("toma la fecha más reciente", () => {
    const a = new Date("2026-01-01T00:00:00Z"), b = new Date("2026-05-01T00:00:00Z");
    expect(ultimoMovimiento([a, null, b, undefined])).toEqual(b);
    expect(ultimoMovimiento([])).toBeNull();
    expect(diasDesde(a, new Date("2026-01-31T12:00:00Z"))).toBe(30);
  });
});

describe("limpiarBorradores", () => {
  it("solo los clientes pedidos, una vez cada uno, recortados", () => {
    const b = { mensajes: [
      { empresaId: "e1", gancho: " Compró ", asunto: "Hola", correo: "x".repeat(4000), whatsapp: "w" },
      { empresaId: "e1", gancho: "dup", asunto: "", correo: "", whatsapp: "" },
      { empresaId: "otro", gancho: "", asunto: "", correo: "", whatsapp: "" },
    ] };
    const r = limpiarBorradores(b, ["e1", "e2"]);
    expect(r).toHaveLength(1);
    expect(r[0].gancho).toBe("Compró");
    expect(r[0].correo).toHaveLength(3000);
  });
});

describe("envioSchema", () => {
  const item = { empresaId: "e", contactoId: "c", canal: "EMAIL", asunto: "Hola", cuerpo: "Texto" };
  it("el correo necesita asunto; el WhatsApp no", () => {
    expect(envioSchema.safeParse({ items: [item] }).success).toBe(true);
    expect(envioSchema.safeParse({ items: [{ ...item, asunto: "" }] }).success).toBe(false);
    expect(envioSchema.safeParse({ items: [{ ...item, canal: "WHATSAPP", asunto: "" }] }).success).toBe(true);
  });
  it("máximo 10 por envío", () => {
    expect(envioSchema.safeParse({ items: Array(11).fill(item) }).success).toBe(false);
  });
});
