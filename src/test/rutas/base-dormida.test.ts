/**
 * Base dormida: la lista, los borradores con IA y el envío respetan el tenant
 * y el alcance del comercial; correo sale a nombre del vendedor y WhatsApp
 * queda como tarea en su Bandeja Hoy.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});
const enviados = vi.hoisted(() => ({ lista: [] as { para: string; asunto: string; remitente: string }[] }));
vi.mock("@/lib/enviar-correo", () => ({
  enviarCorreoAlCliente: async (c: { para: string; asunto: string; remitente: { email: string } }) => {
    enviados.lista.push({ para: c.para, asunto: c.asunto, remitente: c.remitente.email });
    return { ok: true, registro: {} };
  },
}));

import { GET as lista } from "@/app/api/base-dormida/route";
import { POST as redactar } from "@/app/api/ia/base-dormida/route";
import { POST as enviar } from "@/app/api/base-dormida/enviar/route";

const HACE_UN_ANIO = new Date(Date.now() - 365 * 86_400_000);
const ids = (t: typeof A) => ({ empresa: `dormida-${t.tenantId}`, contacto: `dormida-c-${t.tenantId}`, ajena: `dormida-adm-${t.tenantId}` });

type Lista = { clientes: { empresaId: string; compro: boolean; contacto: { id: string } | null }[] };

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  enviados.lista = [];
  parse.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  await prisma.tenant.update({ where: { id: A.tenantId }, data: { emailsActivos: true } });
  for (const t of [A, B]) {
    const i = ids(t);
    // Cliente dormido del comercial: compró hace un año y no se movió más.
    await prisma.empresa.create({ data: { id: i.empresa, tenantId: t.tenantId, nombre: `Dormida ${t.tenantId}`, creadoBy: t.comercial, creadoEn: HACE_UN_ANIO } });
    await prisma.contacto.create({ data: { id: i.contacto, tenantId: t.tenantId, empresaId: i.empresa, nombre: "Pedro Gómez", email: `pedro@${t.tenantId}.test`, telefono: "3001234567", creadoEn: HACE_UN_ANIO } });
    await prisma.oportunidad.create({ data: { tenantId: t.tenantId, empresaId: i.empresa, contactoId: i.contacto, titulo: `Compra secreta ${t.tenantId}`, etapa: "GANADA", creadoBy: t.comercial, creadoEn: HACE_UN_ANIO, fechaCierre: HACE_UN_ANIO } });
    // Cliente dormido del administrador (sin contacto con datos no sale).
    await prisma.empresa.create({ data: { id: i.ajena, tenantId: t.tenantId, nombre: `Del admin ${t.tenantId}`, creadoBy: t.admin, creadoEn: HACE_UN_ANIO } });
    await prisma.contacto.create({ data: { tenantId: t.tenantId, empresaId: i.ajena, nombre: "Lucía", email: `lucia@${t.tenantId}.test`, creadoEn: HACE_UN_ANIO } });
  }
});

describe("lista", () => {
  it("el administrador ve los dormidos de su cuenta, no los que tienen negocio en curso", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(lista, { query: { dias: "90" } });
    expect(status).toBe(200);
    const empresas = (cuerpo as Lista).clientes.map(c => c.empresaId);
    expect(empresas).toEqual(expect.arrayContaining([ids(A).empresa, ids(A).ajena]));
    expect(empresas).not.toContain(A.empresa); // tiene negocios en curso
    expect(empresas).not.toContain(ids(B).empresa);
    // Los que ya compraron van primero.
    expect((cuerpo as Lista).clientes[0]).toMatchObject({ empresaId: ids(A).empresa, compro: true, contacto: { id: ids(A).contacto } });
  });

  it("el comercial ve solo los suyos; un movimiento reciente lo saca de la lista", async () => {
    comoUsuario(A, "COMERCIAL");
    let { cuerpo } = await llamar(lista, {});
    expect((cuerpo as Lista).clientes.map(c => c.empresaId)).toEqual([ids(A).empresa]);
    await prisma.actividad.create({ data: { tenantId: A.tenantId, tipo: "LLAMADA", titulo: "Llamada", fecha: new Date(Date.now() - 86_400_000), empresaId: ids(A).empresa } });
    ({ cuerpo } = await llamar(lista, {}));
    expect((cuerpo as Lista).clientes).toHaveLength(0);
  });
});

describe("redactar con IA", () => {
  it("usa el historial de su cuenta, descarta clientes ajenos y gasta una acción", async () => {
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { mensajes: [
        { empresaId: ids(A).empresa, gancho: "Compró hace un año", asunto: "¿Cómo le fue?", correo: "Hola Pedro", whatsapp: "Hola Pedro" },
        { empresaId: ids(B).empresa, gancho: "x", asunto: "x", correo: "x", whatsapp: "x" },
      ] },
      usage: { input_tokens: 10, output_tokens: 10 },
    });
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(redactar, { body: { empresaIds: [ids(A).empresa, ids(A).ajena, ids(B).empresa] } });
    expect(status).toBe(200);
    expect((cuerpo as { borradores: { empresaId: string }[] }).borradores.map(b => b.empresaId)).toEqual([ids(A).empresa]);
    const datos = (parse.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
    expect(datos).toContain(`Compra secreta ${A.tenantId}`);
    expect(datos).not.toContain(`Compra secreta ${B.tenantId}`);
    expect(datos).not.toContain(`Del admin ${A.tenantId}`); // no es del comercial
    const uso = await prisma.usoIA.findMany({ where: { tenantId: A.tenantId } });
    expect(uso.reduce((s, u) => s + u.cantidad, 0)).toBe(1);
  });

  it("clientes de otra cuenta no existen", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(redactar, { body: { empresaIds: [ids(B).empresa] } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("enviar", () => {
  it("el correo sale a nombre del vendedor y el WhatsApp queda como tarea con el enlace", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(enviar, { body: { items: [
      { empresaId: ids(A).empresa, contactoId: ids(A).contacto, canal: "EMAIL", asunto: "¿Cómo le fue?", cuerpo: "Hola Pedro" },
      { empresaId: ids(A).empresa, contactoId: ids(A).contacto, canal: "WHATSAPP", cuerpo: "Hola Pedro, ¿cómo va?" },
    ] } });
    expect(status).toBe(200);
    expect((cuerpo as { enviados: number }).enviados).toBe(2);
    expect(enviados.lista).toEqual([{ para: `pedro@${A.tenantId}.test`, asunto: "¿Cómo le fue?", remitente: `comercial@${A.tenantId}.test` }]);
    const tarea = await prisma.actividad.findFirst({ where: { tenantId: A.tenantId, titulo: "WhatsApp a Pedro Gómez (reactivar)" } });
    expect(tarea).toMatchObject({ tipo: "TAREA", responsableId: A.comercial, empresaId: ids(A).empresa });
    expect(tarea?.notas).toContain("Abrir WhatsApp: https://wa.me/573001234567?text=Hola%20Pedro");
  });

  it("no envía a contactos de otra cuenta ni a clientes de otro vendedor", async () => {
    comoUsuario(A, "COMERCIAL");
    const contactoAdmin = await prisma.contacto.findFirst({ where: { tenantId: A.tenantId, empresaId: ids(A).ajena } });
    const { cuerpo } = await llamar(enviar, { body: { items: [
      { empresaId: ids(B).empresa, contactoId: ids(B).contacto, canal: "EMAIL", asunto: "x", cuerpo: "x" },
      { empresaId: ids(A).ajena, contactoId: contactoAdmin!.id, canal: "EMAIL", asunto: "x", cuerpo: "x" },
    ] } });
    expect((cuerpo as { enviados: number }).enviados).toBe(0);
    expect(enviados.lista).toHaveLength(0);
  });

  it("con los correos apagados no sale el correo", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { emailsActivos: false } });
    comoUsuario(A, "COMERCIAL");
    const { cuerpo } = await llamar(enviar, { body: { items: [
      { empresaId: ids(A).empresa, contactoId: ids(A).contacto, canal: "EMAIL", asunto: "x", cuerpo: "x" },
    ] } });
    expect((cuerpo as { enviados: number }).enviados).toBe(0);
    expect(enviados.lista).toHaveLength(0);
  });
});
