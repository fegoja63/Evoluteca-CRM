/**
 * Mapa de decisores: alta con papel sugerido por el cargo, sin duplicados,
 * cambio de papel/postura y baja. Un COMERCIAL solo toca el mapa de sus
 * oportunidades y nadie usa contactos de otro cliente.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as listar, POST as agregar } from "@/app/api/oportunidades/[id]/participantes/route";
import { PATCH as editar, DELETE as quitar } from "@/app/api/participantes/[participanteId]/route";

async function contactoNuevo(cargo: string | null) {
  return prisma.contacto.create({
    data: { tenantId: A.tenantId, nombre: `Persona ${cargo ?? "sin cargo"}`, cargo, empresaId: A.empresa },
  });
}

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  comoUsuario(A, "COMERCIAL");
});

describe("Mapa de decisores", () => {
  it("lista las personas del mapa con su contacto", async () => {
    const { status, cuerpo } = await llamar(listar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(200);
    expect(cuerpo).toEqual([expect.objectContaining({ id: A.participante, rol: "INFLUYE", postura: "SIN_CONTACTAR", contacto: expect.objectContaining({ id: A.contacto }) })]);
  });

  it("al agregar sin papel, lo sugiere por el cargo", async () => {
    const c = await contactoNuevo("Gerente General");
    const { status, cuerpo } = await llamar(agregar, { params: { id: A.oportunidadDelComercial }, body: { contactoId: c.id } });
    expect(status).toBe(201);
    expect(cuerpo).toMatchObject({ rol: "DECIDE", postura: "SIN_CONTACTAR" });
  });

  it("respeta el papel que elige el vendedor", async () => {
    const c = await contactoNuevo("Gerente General");
    const { cuerpo } = await llamar(agregar, { params: { id: A.oportunidadDelComercial }, body: { contactoId: c.id, rol: "FRENA" } });
    expect(cuerpo).toMatchObject({ rol: "FRENA" });
  });

  it("no agrega dos veces a la misma persona", async () => {
    const { status } = await llamar(agregar, { params: { id: A.oportunidadDelComercial }, body: { contactoId: A.contacto } });
    expect(status).toBe(409);
  });

  it("no acepta un contacto de otro cliente", async () => {
    const { status } = await llamar(agregar, { params: { id: A.oportunidadDelComercial }, body: { contactoId: B.contacto } });
    expect(status).toBe(404);
    expect(await prisma.participanteOportunidad.count({ where: { tenantId: A.tenantId } })).toBe(1);
  });

  it("rechaza un papel desconocido", async () => {
    const c = await contactoNuevo(null);
    const { status } = await llamar(agregar, { params: { id: A.oportunidadDelComercial }, body: { contactoId: c.id, rol: "JEFE" } });
    expect(status).toBe(400);
  });

  it("cambia papel y postura, y quita del mapa sin borrar el contacto", async () => {
    const r1 = await llamar(editar, { params: { participanteId: A.participante }, body: { rol: "DECIDE", postura: "A_FAVOR" }, metodo: "PATCH" });
    expect(r1.cuerpo).toMatchObject({ rol: "DECIDE", postura: "A_FAVOR" });

    const r2 = await llamar(quitar, { params: { participanteId: A.participante }, metodo: "DELETE" });
    expect(r2.status).toBe(200);
    expect(await prisma.participanteOportunidad.count({ where: { tenantId: A.tenantId } })).toBe(0);
    expect(await prisma.contacto.count({ where: { id: A.contacto, tenantId: A.tenantId } })).toBe(1);
  });

  it("un COMERCIAL no ve ni edita el mapa de una oportunidad ajena", async () => {
    const ajeno = await prisma.participanteOportunidad.create({
      data: { tenantId: A.tenantId, oportunidadId: A.oportunidadAjena, contactoId: A.contacto },
    });
    expect((await llamar(listar, { params: { id: A.oportunidadAjena } })).status).toBe(404);
    expect((await llamar(agregar, { params: { id: A.oportunidadAjena }, body: { contactoId: A.contacto } })).status).toBe(404);
    expect((await llamar(editar, { params: { participanteId: ajeno.id }, body: { rol: "DECIDE" }, metodo: "PATCH" })).status).toBe(404);
    expect((await llamar(quitar, { params: { participanteId: ajeno.id }, metodo: "DELETE" })).status).toBe(404);

    comoUsuario(A, "GERENTE");
    expect((await llamar(listar, { params: { id: A.oportunidadAjena } })).status).toBe(200);
  });
});
