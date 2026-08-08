import { describe, it, expect } from "vitest";
import { generarTokenHilo, construirReplyTo, extraerToken } from "./correo-inbound";

const BASE = "crm.evoluteca.inbox@gmail.com";

describe("generarTokenHilo", () => {
  it("genera 32 caracteres hex", () => {
    const t = generarTokenHilo();
    expect(t).toMatch(/^[0-9a-f]{32}$/);
  });

  it("no repite entre llamadas", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generarTokenHilo()));
    expect(tokens.size).toBe(50);
  });
});

describe("construirReplyTo", () => {
  it("inserta el token como sub-dirección", () => {
    expect(construirReplyTo(BASE, "abc123")).toBe("crm.evoluteca.inbox+abc123@gmail.com");
  });

  it("normaliza mayúsculas y espacios del buzón", () => {
    expect(construirReplyTo("  CRM.Evoluteca.Inbox@Gmail.com ", "tok")).toBe("crm.evoluteca.inbox+tok@gmail.com");
  });

  it("devuelve null si el buzón no tiene formato válido", () => {
    expect(construirReplyTo("sin-arroba", "tok")).toBeNull();
    expect(construirReplyTo("@gmail.com", "tok")).toBeNull();
    expect(construirReplyTo("local@", "tok")).toBeNull();
  });

  it("el Reply-To construido es reversible con extraerToken", () => {
    const token = generarTokenHilo();
    const replyTo = construirReplyTo(BASE, token)!;
    expect(extraerToken([replyTo], BASE)).toBe(token);
  });
});

describe("extraerToken", () => {
  it("extrae el token de la dirección de ingest con sub-tag", () => {
    expect(extraerToken(["crm.evoluteca.inbox+deadbeef@gmail.com"], BASE)).toBe("deadbeef");
  });

  it("ignora mayúsculas en la dirección recibida", () => {
    expect(extraerToken(["CRM.Evoluteca.Inbox+ToKeN@Gmail.com"], BASE)).toBe("token");
  });

  it("encuentra el token aunque venga entre otras direcciones", () => {
    const dirs = ["otro@cliente.com", "crm.evoluteca.inbox+xyz789@gmail.com", "copia@empresa.com"];
    expect(extraerToken(dirs, BASE)).toBe("xyz789");
  });

  it("devuelve null si el buzón coincide pero sin sub-tag", () => {
    expect(extraerToken(["crm.evoluteca.inbox@gmail.com"], BASE)).toBeNull();
  });

  it("no acepta un token de otro dominio aunque tenga el mismo local", () => {
    expect(extraerToken(["crm.evoluteca.inbox+tok@otrodominio.com"], BASE)).toBeNull();
  });

  it("no acepta otro buzón del mismo dominio con sub-tag", () => {
    expect(extraerToken(["ventas+tok@gmail.com"], BASE)).toBeNull();
  });

  it("devuelve null ante lista vacía o direcciones basura", () => {
    expect(extraerToken([], BASE)).toBeNull();
    expect(extraerToken(["", "no-es-email", "@", "a@"], BASE)).toBeNull();
  });
});
