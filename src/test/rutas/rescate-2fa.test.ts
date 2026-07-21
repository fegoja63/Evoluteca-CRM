/**
 * Rescate del segundo factor.
 *
 * La garantía que hay que sostener es doble, y las dos mitades importan:
 *
 *   1. Nadie queda atrapado fuera de su cuenta por perder el teléfono.
 *   2. Un administrador NO puede quedarse con la cuenta de otro. Puede iniciar
 *      el rescate, pero sin acceso al buzón del usuario no consigue nada.
 *
 * Si alguna vez alguien "simplifica" esto haciendo que el admin desactive
 * directamente, la prueba de la segunda mitad se pondrá roja.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar, sinSesion } from "../helpers";
import { prisma } from "../prisma-vigilado";
import { generarSecreto } from "@/lib/dos-factores";

// El envío de correo se simula: aquí se prueba la lógica del rescate, no
// Gmail. Sin esto, cada prueba intentaría abrir una conexión SMTP real.
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: vi.fn(async () => ({ messageId: "simulado" })) }) },
}));

import { POST as iniciarRescate } from "@/app/api/usuarios/[id]/reiniciar-2fa/route";
import { GET as comprobarEnlace, POST as confirmarRescate } from "@/app/api/auth/reiniciar-2fa/route";

/** Deja al comercial de A con el segundo factor activo. */
async function conDosFactoresActivo(usuarioId: string, tenantId: string) {
  const secreto = await generarSecreto();
  await prisma.usuario.updateMany({
    where: { id: usuarioId, tenantId },
    data: { totpSecret: secreto, totpActivadoEn: new Date(), codigosRespaldo: ["hash-falso"] },
  });
}

async function tokenDe(usuarioId: string, tenantId: string) {
  const u = await prisma.usuario.findFirst({
    where: { id: usuarioId, tenantId },
    select: { reset2faToken: true },
  });
  return u?.reset2faToken ?? "";
}

beforeEach(async () => {
  await sembrar();
  await conDosFactoresActivo(A.comercial, A.tenantId);
});

describe("quien puede iniciar el rescate", () => {
  it("un ADMINISTRADOR del mismo cliente, si", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });
    expect(status).toBe(200);
    expect(await tokenDe(A.comercial, A.tenantId)).toHaveLength(64);
  });

  it("un GERENTE no", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });
    expect(status).toBe(403);
    expect(await tokenDe(A.comercial, A.tenantId)).toBe("");
  });

  it("el administrador de OTRO cliente no, ni sabe que existe", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });
    expect(status).toBe(404);
    expect(await tokenDe(A.comercial, A.tenantId)).toBe("");
  });

  it("no tiene sentido si el usuario no tiene el segundo factor activo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(iniciarRescate, { metodo: "POST", params: { id: A.gerente } });
    expect(status).toBe(400);
  });
});

describe("iniciar el rescate NO desactiva nada", () => {
  // Esta es la mitad que protege contra un administrador comprometido.
  it("tras iniciarlo, el segundo factor sigue activo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });

    const u = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpSecret: true, totpActivadoEn: true },
    });
    expect(u?.totpSecret).toBeTruthy();
    expect(u?.totpActivadoEn).not.toBeNull();
  });

  it("la respuesta al administrador NO incluye el token ni el enlace", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { cuerpo } = await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });

    // Si el token viajara de vuelta, el admin podria completar el rescate sin
    // tocar el buzon del usuario y la garantia se caeria entera.
    const token = await tokenDe(A.comercial, A.tenantId);
    const texto = JSON.stringify(cuerpo);
    expect(texto).not.toContain(token);
    expect(texto).not.toContain("reiniciar-2fa?token");
  });
});

describe("el usuario confirma desde su correo", () => {
  beforeEach(async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(iniciarRescate, { metodo: "POST", params: { id: A.comercial } });
    sinSesion(); // quien abre el enlace no tiene sesion: por eso esta aqui
  });

  it("el enlace valido muestra de que cuenta se trata", async () => {
    const token = await tokenDe(A.comercial, A.tenantId);
    const { status, cuerpo } = await llamar(comprobarEnlace, { query: { token } });

    expect(status).toBe(200);
    expect((cuerpo as { valido: boolean }).valido).toBe(true);
    expect((cuerpo as { email: string }).email).toContain(A.tenantId);
  });

  it("un token inventado no sirve", async () => {
    const { status } = await llamar(comprobarEnlace, { query: { token: "a".repeat(64) } });
    expect(status).toBe(400);
  });

  it("al confirmar, se limpia TODO el segundo factor", async () => {
    const token = await tokenDe(A.comercial, A.tenantId);
    const { status } = await llamar(confirmarRescate, { metodo: "POST", body: { token } });
    expect(status).toBe(200);

    const u = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpSecret: true, totpActivadoEn: true, codigosRespaldo: true, reset2faToken: true },
    });
    expect(u?.totpSecret).toBeNull();
    expect(u?.totpActivadoEn).toBeNull();
    expect(u?.codigosRespaldo).toEqual([]);
    // El token tambien: dejarlo convertiria el enlace en reutilizable.
    expect(u?.reset2faToken).toBeNull();
  });

  it("el enlace sirve UNA sola vez", async () => {
    const token = await tokenDe(A.comercial, A.tenantId);
    await llamar(confirmarRescate, { metodo: "POST", body: { token } });

    const { status } = await llamar(confirmarRescate, { metodo: "POST", body: { token } });
    expect(status).toBe(400);
  });

  it("un enlace vencido no sirve", async () => {
    const token = await tokenDe(A.comercial, A.tenantId);
    await prisma.usuario.updateMany({
      where: { id: A.comercial, tenantId: A.tenantId },
      data: { reset2faExpiry: new Date(Date.now() - 1000) },
    });

    const { status } = await llamar(confirmarRescate, { metodo: "POST", body: { token } });
    expect(status).toBe(400);

    const u = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpActivadoEn: true },
    });
    expect(u?.totpActivadoEn).not.toBeNull();
  });

  it("queda registrado en la auditoria, a nombre del usuario y no del admin", async () => {
    const token = await tokenDe(A.comercial, A.tenantId);
    await llamar(confirmarRescate, { metodo: "POST", body: { token } });

    const registros = await prisma.registroAuditoria.findMany({
      where: { tenantId: A.tenantId, entidadId: A.comercial },
      orderBy: { creadoEn: "asc" },
    });

    // Dos entradas: la que inicio el admin y la que confirmo el usuario.
    expect(registros.length).toBeGreaterThanOrEqual(2);
    expect(registros[0].usuarioId).toBe(A.admin);
    expect(registros[0].descripcion).toContain("Inició el rescate");
    expect(registros[registros.length - 1].usuarioId).toBe(A.comercial);
    expect(registros[registros.length - 1].descripcion).toContain("Confirmó");
  });
});
