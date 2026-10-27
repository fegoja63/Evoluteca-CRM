/**
 * Correo de seguimiento desde una minuta: solo minutas de su propio tenant,
 * sin los riesgos internos, respeta el cupo de IA y no envía nada.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

type Peticion = { model: string; messages: { content: string }[] };
type Respuesta = { correo: { asunto: string; cuerpo: string }; oportunidadId: string | null; empresaId: string | null };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});

import { POST as redactar } from "@/app/api/ia/seguimiento-minuta/[id]/route";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  parse.mockReset();
  parse.mockResolvedValue({
    stop_reason: "end_turn",
    parsed_output: { asunto: "Asunto: Seguimiento", cuerpo: "Estimado cliente, gracias." },
    usage: { input_tokens: 10, output_tokens: 10 },
  });
  comoUsuario(A, "COMERCIAL");
});

describe("Correo de seguimiento desde la minuta", () => {
  it("redacta con la minuta de su tenant, sin los riesgos internos y sin enviar", async () => {
    await prisma.minuta.update({ where: { id: A.minuta, tenantId: A.tenantId }, data: { riesgos: ["Riesgo interno secreto"] } });
    const correosAntes = await prisma.correoRegistrado.count({ where: { tenantId: A.tenantId } });
    const { status, cuerpo: c } = await llamar(redactar, { params: { id: A.minuta } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.correo.asunto).toBe("Seguimiento");
    expect(cuerpo.oportunidadId).toBe(A.oportunidadDelComercial);
    const datos = (parse.mock.calls[0][0] as Peticion).messages[0].content;
    expect(datos).toContain("Resumen de la reunión de");
    expect(datos).toContain("Enviar propuesta");
    expect(datos).not.toContain("Riesgo interno secreto");
    expect(await prisma.correoRegistrado.count({ where: { tenantId: A.tenantId } })).toBe(correosAntes);
  });

  it("sin plan de IA no llama a la IA", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status } = await llamar(redactar, { params: { id: A.minuta } });
    expect(status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("la minuta de otro tenant no existe", async () => {
    const { status } = await llamar(redactar, { params: { id: B.minuta } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });
});
