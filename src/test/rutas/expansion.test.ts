/**
 * Sugerencias de expansión: solo para clientes con negocios ganados, con
 * datos de su propio tenant, y sin IA (o sin cupo) igual devuelve las señales.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

type Peticion = { model: string; messages: { content: string }[] };
type Respuesta = { senales: unknown[]; ia: { sugerencias: unknown[] } | null; iaMensaje: string | null };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});

import { POST as sugerir } from "@/app/api/ia/expansion/[id]/route";

const RESPUESTA_IA = {
  sugerencias: [{ tipo: "COMPLEMENTARIO", titulo: " Capacitación ", razon: "Compró el plan.", valorEstimado: 2_000_000 }],
};

async function ganar(oportunidadId: string, tenantId: string) {
  await prisma.oportunidad.update({ where: { id: oportunidadId, tenantId }, data: { etapa: "GANADA", fechaCierre: new Date("2026-06-01T00:00:00Z"), titulo: `Plan ganado ${tenantId}` } });
}

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  parse.mockReset();
  parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: RESPUESTA_IA, usage: { input_tokens: 10, output_tokens: 10 } });
  comoUsuario(A, "COMERCIAL");
});

describe("Sugerencias de expansión", () => {
  it("sin negocios ganados no llama a la IA", async () => {
    const { status, cuerpo: c } = await llamar(sugerir, { params: { id: A.empresa } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.ia).toBeNull();
    expect(cuerpo.iaMensaje).toContain("todavía no tiene negocios ganados");
    expect(parse).not.toHaveBeenCalled();
  });

  it("con negocios ganados sugiere, con el historial y el catálogo de su propio tenant", async () => {
    await ganar(A.oportunidadDelComercial, A.tenantId);
    await ganar(B.oportunidadDelComercial, B.tenantId);
    const { status, cuerpo: c } = await llamar(sugerir, { params: { id: A.empresa } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.ia?.sugerencias).toEqual([{ tipo: "COMPLEMENTARIO", titulo: "Capacitación", razon: "Compró el plan.", valorEstimado: 2_000_000 }]);
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    const datos = p.messages[0].content;
    expect(datos).toContain(`Plan ganado ${A.tenantId}`);
    expect(datos).toContain("Producto de Cliente A");
    expect(datos).not.toContain(`Plan ganado ${B.tenantId}`);
    expect(datos).not.toContain("Producto de Cliente B");
  });

  it("sin plan de IA devuelve las señales y el aviso", async () => {
    await ganar(A.oportunidadDelComercial, A.tenantId);
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status, cuerpo: c } = await llamar(sugerir, { params: { id: A.empresa } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(Array.isArray(cuerpo.senales)).toBe(true);
    expect(cuerpo.iaMensaje).toContain("no están incluidas en su plan");
    expect(parse).not.toHaveBeenCalled();
  });

  it("el cliente de otro tenant no existe", async () => {
    const { status } = await llamar(sugerir, { params: { id: B.empresa } });
    expect(status).toBe(404);
  });
});
