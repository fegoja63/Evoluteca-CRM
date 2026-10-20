/**
 * Gerente financiero con IA: responde con las cifras que calcula el código.
 * La API de Claude se simula. Se verifica qué se le manda al modelo, el
 * acceso (rol y licencia), el cupo de IA y que no responde sin datos.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario, llamar } from "../helpers";

const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status = 500; }
  class RateLimitError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    beta = { messages: { parse } };
  }
  return { default: Anthropic };
});

import { POST as gerente } from "@/app/api/finanzas/gerente-ia/route";

const M = 1_000_000;
const respuestaIA = {
  stop_reason: "end_turn",
  usage: { input_tokens: 3000, output_tokens: 600 },
  parsed_output: {
    titulo: "La caja aguanta, pero queda justa en noviembre",
    parrafos: ["Su caja hoy es de $40 M.", "  ", "El punto más bajo llega el 1 nov."],
    acciones: ["Cobrar la cartera vencida", "Revisar gastos fijos"],
  },
};

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  parse.mockReset();
  parse.mockResolvedValue(respuestaIA);
  process.env.ANTHROPIC_API_KEY = "clave-de-prueba";
  await sinAislamiento("preparar finanzas del tenant A", async () => {
    const t = { tenantId: A.tenantId };
    await prisma.licenciaModulo.deleteMany({ where: t });
    await prisma.periodoFinanciero.deleteMany({ where: t });
    await prisma.balanceFinanciero.deleteMany({ where: t });
    await prisma.usoIA.deleteMany({ where: t });
    await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "ia-gerente:" } } });
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 100 } });
    await prisma.licenciaModulo.create({ data: { ...t, producto: "FINANZAS", desde: new Date("2026-01-01T05:00:00Z"), hasta: new Date("2099-12-31T05:00:00Z"), referenciaPago: "PRUEBA" } });
    await prisma.periodoFinanciero.create({ data: { ...t, mes: "2026-09", ventas: 136 * M, costoVentas: 65 * M, gastosAdmin: 33 * M } });
    await prisma.balanceFinanciero.create({ data: { ...t, corte: new Date("2026-09-30T05:00:00Z"), caja: 40 * M, cuentasPorCobrar: 96 * M, patrimonio: 136 * M } });
  });
});

describe("gerente financiero con IA", () => {
  it("manda las cifras calculadas a claude-opus-5-5 y devuelve la respuesta limpia", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(gerente, { metodo: "POST", body: {} });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ titulo: respuestaIA.parsed_output.titulo, acciones: ["Cobrar la cartera vencida", "Revisar gastos fijos"] });
    expect((cuerpo as { parrafos: string[] }).parrafos).toHaveLength(2); // sin párrafos vacíos

    const pedido = parse.mock.calls[0][0];
    expect(pedido.model).toBe("claude-opus-5-5");
    expect(pedido.fallbacks).toEqual([{ model: "claude-opus-4-8" }]);
    expect(pedido.output_config.format).toBeTruthy();
    const datos = pedido.system[1].text as string;
    expect(datos).toContain("<datos>");
    expect(datos).toContain('"ventas":136');
    expect(pedido.system[1].cache_control).toEqual({ type: "ephemeral" });
    // Sin pregunta, pide el diagnóstico del mes.
    expect(pedido.messages.at(-1).content).toContain("diagnóstico");
  });

  it("una pregunta con historial va como conversación", async () => {
    comoUsuario(A, "GERENTE");
    await llamar(gerente, { metodo: "POST", body: {
      pregunta: "¿Y si contrato a una persona?",
      historial: [{ pregunta: "¿Cómo va la caja?", respuesta: "Queda justa en noviembre." }],
    } });
    const { messages } = parse.mock.calls[0][0];
    expect(messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[2].content).toBe("¿Y si contrato a una persona?");
  });

  it("cuenta una acción de IA y no guarda nada más", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(gerente, { metodo: "POST", body: { pregunta: "¿Cómo voy?" } });
    expect((await prisma.usoIA.findFirst({ where: { tenantId: A.tenantId } }))?.cantidad).toBe(1);
  });

  it("sin estados cargados no llama a la IA", async () => {
    await sinAislamiento("quitar los datos de A", async () => {
      await prisma.periodoFinanciero.deleteMany({ where: { tenantId: A.tenantId } });
      await prisma.balanceFinanciero.deleteMany({ where: { tenantId: A.tenantId } });
    });
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(gerente, { metodo: "POST", body: {} })).status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("un comercial no puede, y sin cupo de IA tampoco", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(gerente, { metodo: "POST", body: {} })).status).toBe(403);
    await sinAislamiento("cupo agotado", () => prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } }));
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(gerente, { metodo: "POST", body: {} })).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("rechaza preguntas demasiado largas", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(gerente, { metodo: "POST", body: { pregunta: "x".repeat(501) } })).status).toBe(400);
  });

  it("si la IA declina, lo dice sin contar el cupo", async () => {
    parse.mockResolvedValue({ ...respuestaIA, stop_reason: "refusal", parsed_output: null });
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(gerente, { metodo: "POST", body: {} })).status).toBe(422);
    expect(await prisma.usoIA.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });
});
