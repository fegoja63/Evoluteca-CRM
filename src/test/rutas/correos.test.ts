/**
 * Correos registrados: aislamiento entre clientes y validación de la ruta de
 * envío. No se ejercita el envío real (depende de Resend y tendría efectos);
 * las pruebas cubren autorización, scope por tenant y rechazo cruzado.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";

import { GET as listar, POST as enviar } from "@/app/api/correos/route";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
});

describe("sin sesión", () => {
  beforeEach(() => sinSesion());

  it("listar responde 401", async () => {
    expect((await llamar(listar)).status).toBe(401);
  });

  it("enviar responde 401", async () => {
    const { status } = await llamar(enviar, { body: { para: "x@y.com", asunto: "A", cuerpo: "B" } });
    expect(status).toBe(401);
  });
});

describe("aislamiento entre clientes", () => {
  it("el listado de B no incluye correos de A y todo es de su tenant", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(listar);
    expect(status).toBe(200);
    const ids = (cuerpo as Array<{ id: string; tenantId: string }>).map(c => c.id);
    expect(ids).not.toContain(A.correo);
    for (const c of cuerpo as Array<{ tenantId: string }>) expect(c.tenantId).toBe(B.tenantId);
  });

  it("filtrar por un contacto de A desde B no devuelve nada", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { cuerpo } = await llamar(listar, { query: { contactoId: A.contacto } });
    expect((cuerpo as unknown[]).length).toBe(0);
  });

  it("B no puede colgar un correo de un contacto de A", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(enviar, {
      body: { para: "x@y.com", asunto: "Hola", cuerpo: "Texto", contactoId: A.contacto },
    });
    expect(status).toBe(400);
  });
});

describe("validación de envío", () => {
  it("rechaza un correo sin asunto", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(enviar, { body: { para: "x@y.com", asunto: "", cuerpo: "Texto" } });
    expect(status).toBe(400);
  });

  it("rechaza un destinatario que no es email", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(enviar, { body: { para: "no-es-email", asunto: "A", cuerpo: "B" } });
    expect(status).toBe(400);
  });
});
