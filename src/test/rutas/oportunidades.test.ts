/**
 * Aislamiento entre clientes y reglas de rol — modulo de Oportunidades.
 *
 * Este archivo es el molde para las demas rutas. Cada ruta deberia responder
 * las mismas cuatro preguntas:
 *
 *   1. Sin sesion, .responde 401?
 *   2. Con sesion de OTRO cliente, .responde 404 (y no 200 ni 500)?
 *   3. En los listados, .aparece algun dato de otro cliente?
 *   4. .Respeta lo que cada rol puede hacer?
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as listar, POST as crear } from "@/app/api/oportunidades/route";
import {
  GET as detalle,
  PATCH as editar,
  DELETE as eliminar,
} from "@/app/api/oportunidades/[id]/route";

beforeAll(async () => {
  await sembrar();
});

// Cada prueba arranca del mismo estado conocido. Solo se paga el costo de
// resembrar cuando la prueba anterior escribio de verdad — lo decide el
// vigilante de Prisma, no una lista escrita a mano.
beforeEach(async () => {
  await sembrarSiHizoFalta();
});

describe("sin sesion", () => {
  beforeEach(() => sinSesion());

  it("el listado responde 401", async () => {
    const { status } = await llamar(listar);
    expect(status).toBe(401);
  });

  it("el detalle responde 401", async () => {
    const { status } = await llamar(detalle, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(401);
  });

  it("crear responde 401", async () => {
    const { status } = await llamar(crear, { body: { titulo: "Intento sin sesion" } });
    expect(status).toBe(401);
  });

  it("editar responde 401", async () => {
    const { status } = await llamar(editar, {
      params: { id: A.oportunidadDelComercial },
      body: { titulo: "Secuestrada" },
    });
    expect(status).toBe(401);
  });

  it("eliminar responde 401", async () => {
    const { status } = await llamar(eliminar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(401);
  });
});

describe("aislamiento entre clientes", () => {
  // El admin de B es el usuario con MAS permisos del otro cliente: si ni el
  // puede tocar datos de A, nadie de B puede.
  beforeEach(() => comoUsuario(B, "ADMINISTRADOR"));

  it("no puede ver el detalle de una oportunidad del cliente A", async () => {
    const { status } = await llamar(detalle, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(404);
  });

  it("el listado no incluye NADA del cliente A", async () => {
    const { status, cuerpo } = await llamar(listar);
    expect(status).toBe(200);

    const ids = (cuerpo as Array<{ id: string; tenantId: string }>).map((o) => o.id);
    expect(ids).not.toContain(A.oportunidadDelComercial);
    expect(ids).not.toContain(A.oportunidadAjena);
    // Y ademas: absolutamente todo lo devuelto es del tenant propio.
    for (const o of cuerpo as Array<{ tenantId: string }>) {
      expect(o.tenantId).toBe(B.tenantId);
    }
  });

  it("?todas=1 tampoco deja ver oportunidades del cliente A", async () => {
    // Este parametro salta el filtro "solo las mias". Salta el de propiedad,
    // NO el de cliente — que es justo lo que se verifica aqui.
    const { cuerpo } = await llamar(listar, { query: { todas: "1" } });
    for (const o of cuerpo as Array<{ tenantId: string }>) {
      expect(o.tenantId).toBe(B.tenantId);
    }
  });

  it("no puede editar una oportunidad del cliente A", async () => {
    const { status } = await llamar(editar, {
      params: { id: A.oportunidadDelComercial },
      body: { titulo: "Secuestrada por el cliente B" },
    });
    expect(status).toBe(404);

    // Lo que de verdad importa no es el codigo de respuesta sino el dato:
    // se comprueba contra la base que el titulo quedo intacto.
    const enBase = await prisma.oportunidad.findFirst({
      where: { id: A.oportunidadDelComercial, tenantId: A.tenantId },
    });
    expect(enBase?.titulo).not.toBe("Secuestrada por el cliente B");
  });

  it("no puede eliminar una oportunidad del cliente A", async () => {
    const { status } = await llamar(eliminar, { params: { id: A.oportunidadAjena } });
    expect(status).toBe(404);

    const enBase = await prisma.oportunidad.findFirst({
      where: { id: A.oportunidadAjena, tenantId: A.tenantId },
    });
    expect(enBase?.eliminadoEn).toBeNull();
  });

  it("no puede colgar una oportunidad propia de una empresa del cliente A", async () => {
    // Vector menos obvio: no leer datos ajenos, sino AMARRAR los propios a
    // ellos. Si pasara, el cliente B veria el nombre de una empresa de A.
    const { status } = await llamar(crear, {
      body: { titulo: "Oportunidad con empresa robada", empresaId: A.empresa },
    });
    expect(status).toBe(400);
  });

  it("no puede reasignar una oportunidad propia a un contacto del cliente A", async () => {
    const { status } = await llamar(editar, {
      params: { id: B.oportunidadDelComercial },
      body: { contactoId: A.contacto },
    });
    expect(status).toBe(400);
  });
});

describe("reglas de rol dentro del mismo cliente", () => {
  it("un COMERCIAL solo ve en el listado las oportunidades que creo", async () => {
    comoUsuario(A, "COMERCIAL");
    const { cuerpo } = await llamar(listar);

    const ids = (cuerpo as Array<{ id: string }>).map((o) => o.id);
    expect(ids).toContain(A.oportunidadDelComercial);
    expect(ids).not.toContain(A.oportunidadAjena);
  });

  it("un GERENTE ve todas las de su cliente, no solo las suyas", async () => {
    comoUsuario(A, "GERENTE");
    const { cuerpo } = await llamar(listar);

    const ids = (cuerpo as Array<{ id: string }>).map((o) => o.id);
    expect(ids).toContain(A.oportunidadDelComercial);
    expect(ids).toContain(A.oportunidadAjena);
  });

  it("un COMERCIAL no puede eliminar", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(eliminar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(403);
  });

  it("un ADMINISTRADOR si puede eliminar, y va a la papelera (no se borra)", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(200);

    const enBase = await prisma.oportunidad.findFirst({
      where: { id: A.oportunidadDelComercial, tenantId: A.tenantId },
    });
    expect(enBase).not.toBeNull();
    expect(enBase?.eliminadoEn).not.toBeNull();
  });
});

describe("el guardarrail de Prisma", () => {
  // Sin esta prueba, un guardarrail roto pasaria inadvertido: todas las demas
  // pruebas seguirian en verde y creeriamos estar protegidos cuando no.
  it("lanza si una consulta a un modelo con tenantId no filtra por tenant", async () => {
    await expect(
      prisma.oportunidad.findMany({ where: { etapa: "PROSPECTO" } })
    ).rejects.toThrow(/FUGA ENTRE CLIENTES/);
  });

  it("deja pasar la misma consulta cuando si filtra por tenant", async () => {
    await expect(
      prisma.oportunidad.findMany({ where: { etapa: "PROSPECTO", tenantId: A.tenantId } })
    ).resolves.toBeInstanceOf(Array);
  });
});
