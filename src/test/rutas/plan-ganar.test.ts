/**
 * Plan para ganar: solo negocios abiertos de su propio tenant, con los datos
 * de ese tenant (minutas, decisores, guía), y respeta el cupo de IA.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

type Peticion = { model: string; messages: { content: string }[] };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});

import { POST as armar } from "@/app/api/ia/plan-ganar/[id]/route";

const RESPUESTA_IA = {
  lectura: "Está en propuesta.",
  calificacion: [{ criterio: "AJUSTE", nivel: "ALTA", porque: "Encaja." }],
  riesgos: [{ riesgo: "Precio", senal: "Pidió descuento", pregunta: "¿Cuál es su presupuesto?" }],
  propuestaValor: "Ahorro.",
  mensajes: [],
  proximosPasos: [{ tipo: "LLAMADA", titulo: " Llamar al cliente ", porque: "Confirmar." }],
  faltaSaber: [],
};

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

describe("Plan para ganar", () => {
  it("arma el plan con los datos de su propio tenant", async () => {
    for (const t of [A, B]) {
      await prisma.minuta.create({ data: {
        tenantId: t.tenantId, oportunidadId: t.oportunidadDelComercial, fecha: new Date("2026-10-01T00:00:00Z"),
        titulo: `Reunión ${t.tenantId}`, resumen: `Resumen secreto ${t.tenantId}`,
      } });
    }
    const { status, cuerpo } = await llamar(armar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(200);
    expect((cuerpo as { plan: { proximosPasos: { titulo: string }[] } }).plan.proximosPasos[0].titulo).toBe("Llamar al cliente");
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    const datos = p.messages[0].content;
    expect(datos).toContain(`Resumen secreto ${A.tenantId}`);
    expect(datos).not.toContain(`Resumen secreto ${B.tenantId}`);
    const uso = await prisma.usoIA.findMany({ where: { tenantId: A.tenantId } });
    expect(uso.reduce((s, u) => s + u.cantidad, 0)).toBeGreaterThan(0);
  });

  it("no aplica a negocios cerrados", async () => {
    await prisma.oportunidad.update({ where: { id: A.oportunidadDelComercial, tenantId: A.tenantId }, data: { etapa: "GANADA" } });
    const { status } = await llamar(armar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("sin plan de IA no llama a la IA", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status } = await llamar(armar, { params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("la oportunidad de otro tenant no existe", async () => {
    const { status } = await llamar(armar, { params: { id: B.oportunidadDelComercial } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });
});
