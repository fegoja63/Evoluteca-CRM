/**
 * Chat web: el visitante conversa sin cuenta (token del tenant + secreto de la
 * conversación), cada conversación cuenta una acción de IA, y con nombre y
 * correo o celular se crea el lead del tenant correcto. La configuración es
 * solo de administradores.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";

type Peticion = { model: string; system: { text: string }[]; messages: { role: string; content: string }[] };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});

import { GET as verChat, POST as escribir } from "@/app/api/publica/agente/[token]/route";
import { GET as verConfig, PUT as guardarConfig } from "@/app/api/agente-web/route";

const TOKEN = "0123456789abcdef0123456789abcdef";
const TOKEN_B = "fedcba9876543210fedcba9876543210";
const AGENDA = "abcdef0123456789abcdef0123456789";
type Datos = Record<"nombre" | "empresa" | "email" | "telefono" | "necesidad" | "cantidad" | "plazo", string | null>;
const vacio: Datos = { nombre: null, empresa: null, email: null, telefono: null, necesidad: null, cantidad: null, plazo: null };
const respuesta = (datos: Partial<Datos> = {}, extra: Record<string, unknown> = {}) => ({
  stop_reason: "end_turn",
  parsed_output: { respuesta: "Con gusto le ayudo.", datos: { ...vacio, ...datos }, calificacion: "MEDIA", ofrecerAgenda: false, ...extra },
  usage: { input_tokens: 100, output_tokens: 20 },
});

type Salida = { conversacionId: string; secreto: string; respuesta: string; agendaUrl: string | null };
const decir = (mensaje: string, conv?: { conversacionId: string; secreto: string }, token = TOKEN) =>
  llamar(escribir, { params: { token }, body: { mensaje, ...conv } });

async function accionesIA(tenantId: string) {
  const uso = await prisma.usoIA.findMany({ where: { tenantId } });
  return uso.reduce((s, u) => s + u.cantidad, 0);
}

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  parse.mockReset();
  parse.mockResolvedValue(respuesta());
  await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { tokenAgenda: AGENDA } });
  await prisma.tenant.update({
    where: { id: A.tenantId },
    data: { agenteWebToken: TOKEN, agenteWebConfig: { activo: true, nombre: "Sofi", saludo: "Hola", info: "Info secreta de A", responsableId: A.comercial } },
  });
  await prisma.tenant.update({
    where: { id: B.tenantId },
    data: { agenteWebToken: TOKEN_B, agenteWebConfig: { activo: true, nombre: "Beto", saludo: "Hola", info: "Info secreta de B", responsableId: null } },
  });
  await sinAislamiento("limpiar el límite de mensajes del chat", () => prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "agente" } } }));
  sinSesion();
});

describe("chat público", () => {
  it("muestra el nombre y el saludo; un token inexistente o apagado responde 404", async () => {
    const { status, cuerpo } = await llamar(verChat, { params: { token: TOKEN } });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ nombre: "Sofi", saludo: "Hola" });
    expect((await llamar(verChat, { params: { token: "f".repeat(32) } })).status).toBe(404);
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { agenteWebConfig: { activo: false, nombre: "Sofi", saludo: "Hola", info: "", responsableId: null } } });
    expect((await llamar(verChat, { params: { token: TOKEN } })).status).toBe(404);
    expect((await decir("hola")).status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });

  it("responde con la información de su empresa y no crea lead sin datos de contacto", async () => {
    const { status, cuerpo } = await decir("¿Venden bidones?");
    expect(status).toBe(200);
    const s = cuerpo as Salida;
    expect(s.respuesta).toBe("Con gusto le ayudo.");
    expect(s.secreto).toMatch(/^[0-9a-f]{32}$/);
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.system[0].text).toContain("Info secreta de A");
    expect(p.system[0].text).toContain(`Producto de`);
    expect(p.system[0].text).not.toContain("Info secreta de B");
    expect(p.messages).toEqual([{ role: "user", content: "¿Venden bidones?" }]);
    const conv = await prisma.conversacionAgente.findFirst({ where: { id: s.conversacionId, tenantId: A.tenantId } });
    expect(conv?.oportunidadId).toBeNull();
    expect(await accionesIA(A.tenantId)).toBe(1);
  });

  it("con nombre y correo crea el lead del responsable; la conversación cuenta una sola acción", async () => {
    const primero = (await decir("Necesito 200 bidones")).cuerpo as Salida;
    parse.mockResolvedValueOnce(respuesta(
      { nombre: "Marcelo Torres", email: "marcelo@cliente.test", necesidad: "200 bidones" },
      { calificacion: "ALTA", ofrecerAgenda: true },
    ));
    const { status, cuerpo } = await decir("Soy Marcelo, marcelo@cliente.test", primero);
    expect(status).toBe(200);
    expect((cuerpo as Salida).conversacionId).toBe(primero.conversacionId);
    expect((cuerpo as Salida).agendaUrl).toBe(`/agendar/${AGENDA}`);

    const p = parse.mock.calls[1][0] as Peticion;
    expect(p.messages.map(m => m.role)).toEqual(["user", "assistant", "user"]);

    const conv = await prisma.conversacionAgente.findFirst({ where: { id: primero.conversacionId, tenantId: A.tenantId } });
    expect(conv?.calificacion).toBe("ALTA");
    const op = await prisma.oportunidad.findFirst({ where: { id: conv!.oportunidadId!, tenantId: A.tenantId }, include: { contacto: true } });
    expect(op).toMatchObject({ origenLead: "Chat web", creadoBy: A.comercial, etapa: "PROSPECTO" });
    expect(op?.contacto?.email).toBe("marcelo@cliente.test");
    expect(op?.notas).toContain("Necesidad: 200 bidones");
    expect(await accionesIA(A.tenantId)).toBe(1);

    // Un tercer mensaje no vuelve a crear el lead.
    parse.mockResolvedValueOnce(respuesta({ nombre: "Marcelo Torres", email: "marcelo@cliente.test" }));
    await decir("Gracias", primero);
    expect(await prisma.oportunidad.count({ where: { tenantId: A.tenantId, origenLead: "Chat web" } })).toBe(1);
  });

  it("sin el secreto correcto no se retoma la conversación de otro", async () => {
    const ajena = (await decir("Hola")).cuerpo as Salida;
    const { cuerpo } = await decir("Hola de nuevo", { conversacionId: ajena.conversacionId, secreto: "0".repeat(32) });
    expect((cuerpo as Salida).conversacionId).not.toBe(ajena.conversacionId);
    // Ni con el token de otro tenant.
    const { cuerpo: deB } = await decir("Hola", { conversacionId: ajena.conversacionId, secreto: ajena.secreto }, TOKEN_B);
    expect((deB as Salida).conversacionId).not.toBe(ajena.conversacionId);
    const conv = await prisma.conversacionAgente.findFirst({ where: { id: ajena.conversacionId, tenantId: A.tenantId } });
    expect((conv?.mensajes as unknown[]).length).toBe(2);
  });

  it("corta al llegar al límite de mensajes sin llamar a la IA", async () => {
    const s = (await decir("Hola")).cuerpo as Salida;
    const mensajes = Array.from({ length: 40 }, (_, i) => ({ rol: i % 2 ? "agente" : "visitante", texto: "x", en: "" }));
    await prisma.conversacionAgente.update({ where: { id: s.conversacionId, tenantId: A.tenantId }, data: { mensajes } });
    parse.mockClear();
    const { status } = await decir("¿Sigue ahí?", s);
    expect(status).toBe(429);
    expect(parse).not.toHaveBeenCalled();
  });

  it("sin cupo de IA no empieza conversaciones", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status } = await decir("Hola");
    expect(status).toBe(503);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("configuración", () => {
  const valida = { activo: true, nombre: "Sofi", saludo: "Hola", info: "Vendemos agua", responsableId: null };

  it("solo la ve y la cambia un administrador", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(verConfig)).status).toBe(403);
    expect((await llamar(guardarConfig, { metodo: "PUT", body: valida })).status).toBe(403);
  });

  it("al activarlo se crea el código; no acepta un responsable de otro tenant", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { agenteWebToken: null } });
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(guardarConfig, { metodo: "PUT", body: valida });
    expect(status).toBe(200);
    expect((cuerpo as { token: string }).token).toMatch(/^[0-9a-f]{32}$/);
    const ajeno = await llamar(guardarConfig, { metodo: "PUT", body: { ...valida, responsableId: B.comercial } });
    expect(ajeno.status).toBe(400);
  });
});
