/**
 * Detección y fusión de duplicados.
 *
 * Cubre lo que el test unitario del agrupamiento (src/lib/duplicados.test.ts) no
 * puede: que la RUTA de fusión, contra la base, re-apunte todo lo colgado al
 * sobreviviente, mande el duplicado a la papelera, respete el aislamiento entre
 * clientes y el rol, y deje registro de auditoría.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as listarDup } from "@/app/api/duplicados/route";
import { POST as fusionar } from "@/app/api/duplicados/fusionar/route";

// Ids locales de este archivo (no chocan con los de la siembra).
const SOBREV = "dup-con-sobrev";
const PERD = "dup-con-perd";
const OP = "dup-op-1";
const COR = "dup-cor-1";
const EMP_SOBREV = "dup-emp-sobrev";
const EMP_PERD = "dup-emp-perd";
const CON_DE_EMP = "dup-con-de-emp";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
});

/** Crea dos contactos con el mismo correo (normalizado) en el tenant A, y cuelga
 *  una oportunidad y un correo del que será el perdedor. */
async function sembrarContactosDuplicados() {
  await prisma.contacto.create({
    data: { id: SOBREV, tenantId: A.tenantId, nombre: "Juan Perez", email: "dup@x.com" },
  });
  await prisma.contacto.create({
    data: { id: PERD, tenantId: A.tenantId, nombre: "Juan Pérez", email: "DUP@x.com ", telefono: "300" },
  });
  await prisma.oportunidad.create({
    data: { id: OP, tenantId: A.tenantId, titulo: "Colgada del duplicado", etapa: "PROSPECTO", contactoId: PERD, creadoBy: A.admin },
  });
  await prisma.correoRegistrado.create({
    data: { id: COR, tenantId: A.tenantId, direccion: "ENVIADO", de: "x@y.com", para: "z@y.com", asunto: "hola", cuerpo: "...", contactoId: PERD },
  });
}

describe("permisos", () => {
  it("sin sesión, listar responde 401", async () => {
    sinSesion();
    const { status } = await llamar(listarDup, { query: { tipo: "contactos" } });
    expect(status).toBe(401);
  });

  it("un COMERCIAL no puede listar duplicados (403)", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(listarDup, { query: { tipo: "contactos" } });
    expect(status).toBe(403);
  });

  it("un COMERCIAL no puede fusionar (403)", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(fusionar, { body: { tipo: "contactos", sobrevivienteId: A.contacto, perdedoresIds: [A.contacto] } });
    expect(status).toBe(403);
  });
});

describe("detección de racimos (contactos)", () => {
  it("agrupa dos contactos con el mismo correo y muestra lo que cuelga del duplicado", async () => {
    await sembrarContactosDuplicados();
    comoUsuario(A, "ADMINISTRADOR");

    const { status, cuerpo } = await llamar(listarDup, { query: { tipo: "contactos" } });
    expect(status).toBe(200);

    const racimos = (cuerpo as { racimos: Array<{ registros: Array<{ id: string; conteos: Record<string, number> }> }> }).racimos;
    const racimo = racimos.find((r) => r.registros.some((x) => x.id === SOBREV) && r.registros.some((x) => x.id === PERD));
    expect(racimo).toBeTruthy();

    const perdedor = racimo!.registros.find((x) => x.id === PERD)!;
    expect(perdedor.conteos.oportunidades).toBe(1);
    expect(perdedor.conteos.correos).toBe(1);
  });
});

describe("fusión de contactos", () => {
  it("re-apunta lo colgado al sobreviviente, manda el duplicado a la papelera y audita", async () => {
    await sembrarContactosDuplicados();
    comoUsuario(A, "ADMINISTRADOR");

    const { status, cuerpo } = await llamar(fusionar, {
      body: { tipo: "contactos", sobrevivienteId: SOBREV, perdedoresIds: [PERD] },
    });
    expect(status).toBe(200);
    expect((cuerpo as { fusionados: number }).fusionados).toBe(1);

    // El sobreviviente sigue activo; el duplicado quedó en papelera.
    const sobrev = await prisma.contacto.findFirst({ where: { id: SOBREV, tenantId: A.tenantId } });
    const perd = await prisma.contacto.findFirst({ where: { id: PERD, tenantId: A.tenantId } });
    expect(sobrev?.eliminadoEn).toBeNull();
    expect(perd?.eliminadoEn).not.toBeNull();

    // Lo que colgaba del duplicado ahora cuelga del sobreviviente.
    const op = await prisma.oportunidad.findFirst({ where: { id: OP, tenantId: A.tenantId } });
    const cor = await prisma.correoRegistrado.findFirst({ where: { id: COR, tenantId: A.tenantId } });
    expect(op?.contactoId).toBe(SOBREV);
    expect(cor?.contactoId).toBe(SOBREV);

    // El sobreviviente heredó el teléfono que solo tenía el duplicado.
    expect(sobrev?.telefono).toBe("300");

    // Quedó el registro de auditoría.
    const audit = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, accion: "FUSIONAR", entidad: "Contacto", entidadId: SOBREV },
    });
    expect(audit).toBeTruthy();
  });

  it("rechaza fusionar contactos de otro cliente (aislamiento)", async () => {
    await sembrarContactosDuplicados(); // están en A
    comoUsuario(B, "ADMINISTRADOR"); // pero pregunta el admin de B

    const { status } = await llamar(fusionar, {
      body: { tipo: "contactos", sobrevivienteId: SOBREV, perdedoresIds: [PERD] },
    });
    expect(status).toBe(400);

    // Y de verdad no tocó nada: el duplicado sigue vivo.
    const perd = await prisma.contacto.findFirst({ where: { id: PERD, tenantId: A.tenantId } });
    expect(perd?.eliminadoEn).toBeNull();
  });

  it("no deja poner el sobreviviente también como duplicado", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(fusionar, {
      body: { tipo: "contactos", sobrevivienteId: A.contacto, perdedoresIds: [A.contacto] },
    });
    expect(status).toBe(400);
  });
});

describe("fusión de empresas", () => {
  it("reasigna los contactos de la empresa duplicada a la sobreviviente", async () => {
    await prisma.empresa.create({ data: { id: EMP_SOBREV, tenantId: A.tenantId, nombre: "Acme S.A." } });
    await prisma.empresa.create({ data: { id: EMP_PERD, tenantId: A.tenantId, nombre: "acme s a", sector: "Tecnología" } });
    await prisma.contacto.create({ data: { id: CON_DE_EMP, tenantId: A.tenantId, nombre: "Contacto de la duplicada", empresaId: EMP_PERD } });

    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(fusionar, {
      body: { tipo: "empresas", sobrevivienteId: EMP_SOBREV, perdedoresIds: [EMP_PERD] },
    });
    expect(status).toBe(200);

    const empPerd = await prisma.empresa.findFirst({ where: { id: EMP_PERD, tenantId: A.tenantId } });
    const con = await prisma.contacto.findFirst({ where: { id: CON_DE_EMP, tenantId: A.tenantId } });
    const empSobrev = await prisma.empresa.findFirst({ where: { id: EMP_SOBREV, tenantId: A.tenantId } });
    expect(empPerd?.eliminadoEn).not.toBeNull();
    expect(con?.empresaId).toBe(EMP_SOBREV);
    // Heredó el sector que solo tenía la duplicada.
    expect(empSobrev?.sector).toBe("Tecnología");
  });
});
