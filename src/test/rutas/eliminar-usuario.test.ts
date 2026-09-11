/**
 * Eliminar un usuario del equipo (borrado definitivo).
 *
 * Lo que hay que sostener:
 *   1. Solo un ADMINISTRADOR del mismo tenant puede borrar; nadie borra su
 *      propia cuenta ni la del titular.
 *   2. Al borrar, los registros que la persona tenía a su nombre no quedan
 *      apuntando a un id fantasma: o se traspasan a otro vendedor, o quedan
 *      "sin dueño" (creadoBy null), que es lo que el panel de Equipo sabe
 *      recuperar.
 *   3. Queda constancia en la auditoría, a nombre de quien lo hizo.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";

import { DELETE as eliminarUsuario } from "@/app/api/usuarios/[id]/route";

// Comprobaciones del lado de la prueba: miran un id concreto que ya sabemos de
// qué tenant es, así que se saltan el guardián de aislamiento a propósito.
const existe = (id: string) =>
  sinAislamiento("verificar existencia por id en la prueba", async () =>
    (await prisma.usuario.count({ where: { id } })) > 0);

const duenoDeOportunidad = (id: string) =>
  sinAislamiento("leer creadoBy por id en la prueba", async () =>
    (await prisma.oportunidad.findUnique({ where: { id }, select: { creadoBy: true } }))?.creadoBy ?? null);

beforeEach(async () => {
  await sembrar();
});

describe("quién puede borrar", () => {
  it("un ADMINISTRADOR del mismo tenant, sí", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });
    expect(status).toBe(200);
    expect(await existe(A.comercial)).toBe(false);
  });

  it("un GERENTE no", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });
    expect(status).toBe(403);
    expect(await existe(A.comercial)).toBe(true);
  });

  it("el administrador de OTRO tenant no, ni sabe que existe", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });
    expect(status).toBe(404);
    expect(await existe(A.comercial)).toBe(true);
  });
});

describe("candados contra el disparo en el pie", () => {
  it("nadie borra su propia cuenta", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.admin } });
    expect(status).toBe(400);
    expect(await existe(A.admin)).toBe(true);
  });

  it("no se puede borrar al titular de la cuenta", async () => {
    await prisma.usuario.update({ where: { id: A.comercial }, data: { esTitular: true } });
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });
    expect(status).toBe(400);
    expect(await existe(A.comercial)).toBe(true);
  });
});

describe("qué pasa con los registros de la persona", () => {
  it("sin reasignar, sus oportunidades quedan sin dueño (null), no con un id fantasma", async () => {
    // La oportunidadDelComercial la creó A.comercial.
    expect(await duenoDeOportunidad(A.oportunidadDelComercial)).toBe(A.comercial);

    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });
    expect(status).toBe(200);

    expect(await duenoDeOportunidad(A.oportunidadDelComercial)).toBeNull();
    // La del admin no se toca.
    expect(await duenoDeOportunidad(A.oportunidadAjena)).toBe(A.admin);
  });

  it("con reasignarA, sus oportunidades pasan a ese vendedor", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, {
      metodo: "DELETE",
      params: { id: A.comercial },
      query: { reasignarA: A.gerente },
    });
    expect(status).toBe(200);
    expect(await duenoDeOportunidad(A.oportunidadDelComercial)).toBe(A.gerente);
  });

  it("no acepta reasignar a un vendedor inactivo", async () => {
    await prisma.usuario.update({ where: { id: A.gerente }, data: { activo: false } });
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, {
      metodo: "DELETE",
      params: { id: A.comercial },
      query: { reasignarA: A.gerente },
    });
    expect(status).toBe(400);
    expect(await existe(A.comercial)).toBe(true);
  });

  it("no acepta reasignar a un vendedor de otro tenant", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(eliminarUsuario, {
      metodo: "DELETE",
      params: { id: A.comercial },
      query: { reasignarA: B.gerente },
    });
    expect(status).toBe(400);
    expect(await existe(A.comercial)).toBe(true);
  });
});

describe("rastro en la auditoría", () => {
  it("queda un ELIMINAR_USUARIO a nombre de quien lo hizo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(eliminarUsuario, { metodo: "DELETE", params: { id: A.comercial } });

    const registro = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, entidadId: A.comercial, accion: "ELIMINAR_USUARIO" },
    });
    expect(registro).not.toBeNull();
    expect(registro?.usuarioId).toBe(A.admin);
  });
});
