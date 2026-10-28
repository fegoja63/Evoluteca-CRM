/**
 * Análisis del negocio del cliente: lee un documento y/o texto, guarda uno por
 * cliente, solo dentro del tenant, respeta el cupo de IA, y el Plan para ganar
 * lo usa.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";

type Peticion = { model: string; messages: { content: { type: string; text?: string }[] | string }[] };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class BadRequestError extends APIError {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; static BadRequestError = BadRequestError; }
  return { default: Anthropic };
});

import { GET, POST, DELETE } from "@/app/api/ia/analisis-cliente/[id]/route";
import { POST as armarPlan } from "@/app/api/ia/plan-ganar/[id]/route";

const RESPUESTA_IA = {
  situacion: " Situación secreta del cliente A ", desafios: ["Costos altos"], objetivos: ["Crecer"], plazo: "2027",
  exito: null, dondeAyudar: ["Auditoría de procesos"], preguntas: ["¿Presupuesto?"],
};

function enviar(id: string, partes: { archivo?: File; texto?: string }) {
  const form = new FormData();
  if (partes.archivo) form.append("archivo", partes.archivo);
  if (partes.texto) form.append("texto", partes.texto);
  return POST(new Request("http://localhost/api/ia/analisis-cliente", { method: "POST", body: form }), { params: Promise.resolve({ id }) });
}
const pdf = () => new File(["%PDF-1.4 informe"], "informe-anual.pdf", { type: "application/pdf" });
const TEXTO = "El cliente anunció un plan de expansión a tres ciudades nuevas durante 2027, con foco en eficiencia.";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  parse.mockReset();
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: RESPUESTA_IA, usage: { input_tokens: 10, output_tokens: 10 } });
  await sinAislamiento("limpiar análisis y límites", async () => {
    await prisma.analisisCliente.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
    await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "ia-analisis-cliente:" } } });
  });
  comoUsuario(A, "COMERCIAL");
});

describe("Análisis del negocio del cliente", () => {
  it("lee el PDF y el texto, guarda el análisis y lo devuelve", async () => {
    const r = await enviar(A.empresa, { archivo: pdf(), texto: TEXTO });
    expect(r.status).toBe(200);
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    const contenido = p.messages[0].content as { type: string; text?: string }[];
    expect(contenido[0].type).toBe("document");
    expect(contenido[1].text).toContain("plan de expansión");

    const { cuerpo } = await llamar(GET, { params: { id: A.empresa } });
    const a = (cuerpo as { analisis: { situacion: string; fuentes: string; plazo: string; exito: string | null } }).analisis;
    expect(a.situacion).toBe("Situación secreta del cliente A");
    expect(a.fuentes).toBe("informe-anual.pdf + texto pegado");
    expect(a.exito).toBeNull();
  });

  it("analizar de nuevo reemplaza el anterior (uno por cliente)", async () => {
    await enviar(A.empresa, { texto: TEXTO });
    await enviar(A.empresa, { texto: TEXTO + " Segunda versión." });
    expect(await prisma.analisisCliente.count({ where: { empresaId: A.empresa, tenantId: A.tenantId } })).toBe(1);
  });

  it("sin material suficiente no llama a la IA", async () => {
    const r = await enviar(A.empresa, { texto: "corto" });
    expect(r.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("sin plan de IA no llama a la IA", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const r = await enviar(A.empresa, { texto: TEXTO });
    expect(r.status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("el cliente de otro tenant no existe para leer, analizar ni borrar", async () => {
    expect((await enviar(B.empresa, { texto: TEXTO })).status).toBe(404);
    expect((await llamar(GET, { params: { id: B.empresa } })).status).toBe(404);
    expect((await llamar(DELETE, { params: { id: B.empresa }, metodo: "DELETE" })).status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });

  it("borrar lo quita", async () => {
    await enviar(A.empresa, { texto: TEXTO });
    expect((await llamar(DELETE, { params: { id: A.empresa }, metodo: "DELETE" })).status).toBe(200);
    expect(await prisma.analisisCliente.count({ where: { empresaId: A.empresa, tenantId: A.tenantId } })).toBe(0);
  });

  it("el Plan para ganar usa el análisis guardado del cliente", async () => {
    await enviar(A.empresa, { texto: TEXTO });
    parse.mockClear();
    parse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { lectura: "x", calificacion: [], riesgos: [], propuestaValor: "x", mensajes: [], proximosPasos: [], faltaSaber: [] },
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const { status } = await llamar(armarPlan, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(200);
    const datos = (parse.mock.calls[0][0] as Peticion).messages[0].content as string;
    expect(datos).toContain("ANÁLISIS DEL NEGOCIO DEL CLIENTE");
    expect(datos).toContain("Situación secreta del cliente A");
  });
});
