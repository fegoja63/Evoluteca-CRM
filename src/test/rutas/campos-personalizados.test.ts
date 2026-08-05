/**
 * Aislamiento entre clientes y reglas de rol — campos personalizados.
 * Sigue el mismo molde que oportunidades.test.ts.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";

import { GET as listar, POST as crear } from "@/app/api/campos-personalizados/route";
import { PATCH as editar, DELETE as eliminar } from "@/app/api/campos-personalizados/[id]/route";

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

  it("crear responde 401", async () => {
    const { status } = await llamar(crear, { body: { entidad: "EMPRESA", etiqueta: "X", tipo: "TEXTO" } });
    expect(status).toBe(401);
  });
});

describe("reglas de rol", () => {
  it("un COMERCIAL no puede crear campos", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(crear, { body: { entidad: "EMPRESA", etiqueta: "NIT", tipo: "TEXTO" } });
    expect(status).toBe(403);
  });

  it("un ADMINISTRADOR crea un campo con clave cp_ y aparece en el listado", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const creado = await llamar(crear, { body: { entidad: "OPORTUNIDAD", etiqueta: "Competidor", tipo: "TEXTO" } });
    expect(creado.status).toBe(201);

    const campo = creado.cuerpo as { id: string; clave: string; tenantId: string };
    expect(campo.clave).toBe("cp_competidor");
    expect(campo.tenantId).toBe(A.tenantId);

    const { cuerpo } = await llamar(listar, { query: { entidad: "OPORTUNIDAD" } });
    const ids = (cuerpo as Array<{ id: string }>).map(c => c.id);
    expect(ids).toContain(campo.id);
  });

  it("exige al menos 2 opciones para un campo de tipo Lista", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(crear, {
      body: { entidad: "EMPRESA", etiqueta: "Segmento", tipo: "LISTA", opciones: ["Gobierno"] },
    });
    expect(status).toBe(400);
  });
});

describe("aislamiento entre clientes", () => {
  it("el cliente B no ve ni puede tocar un campo del cliente A", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const creado = await llamar(crear, { body: { entidad: "EMPRESA", etiqueta: "NIT", tipo: "TEXTO" } });
    const id = (creado.cuerpo as { id: string }).id;

    comoUsuario(B, "ADMINISTRADOR");
    const { cuerpo } = await llamar(listar);
    const ids = (cuerpo as Array<{ id: string; tenantId: string }>).map(c => c.id);
    expect(ids).not.toContain(id);
    for (const c of cuerpo as Array<{ tenantId: string }>) expect(c.tenantId).toBe(B.tenantId);

    const patch = await llamar(editar, { params: { id }, body: { etiqueta: "Robado" }, metodo: "PATCH" });
    expect(patch.status).toBe(404);

    const del = await llamar(eliminar, { params: { id }, metodo: "DELETE" });
    expect(del.status).toBe(404);
  });
});
