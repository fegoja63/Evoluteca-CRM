/**
 * Preparar reunión: solo reuniones o visitas pendientes de su propio tenant,
 * con los datos de ese tenant, y respeta el cupo de IA.
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

import { POST as preparar } from "@/app/api/ia/preparar-reunion/[id]/route";

const RESPUESTA_IA = {
  objetivo: "Acordar la demo.",
  agenda: [{ punto: "Necesidades", porque: "Para enfocar la demo." }],
  participantes: [{ persona: "Gerente financiero", porque: "Aprueba el presupuesto." }],
  preguntas: ["¿Cuál es su presupuesto?"],
  llevar: ["Propuesta"],
  invitacion: { asunto: " Reunión de seguimiento ", cuerpo: "Buenos días." },
};

async function volverReunion(t: typeof A) {
  await prisma.actividad.update({ where: { id: t.actividad, tenantId: t.tenantId }, data: { tipo: "REUNION", completada: false } });
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

describe("Preparar reunión", () => {
  it("prepara una reunión con los datos de su propio tenant", async () => {
    await volverReunion(A);
    for (const t of [A, B]) {
      await prisma.minuta.create({ data: {
        tenantId: t.tenantId, oportunidadId: t.oportunidadDelComercial, fecha: new Date("2026-10-01T00:00:00Z"),
        titulo: `Reunión ${t.tenantId}`, resumen: `Resumen secreto ${t.tenantId}`,
      } });
    }
    const { status, cuerpo } = await llamar(preparar, { params: { id: A.actividad } });
    expect(status).toBe(200);
    expect((cuerpo as { preparacion: { invitacion: { asunto: string } } }).preparacion.invitacion.asunto).toBe("Reunión de seguimiento");
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    const datos = p.messages[0].content;
    expect(datos).toContain("REUNIÓN A PREPARAR: Actividad de");
    expect(datos).toContain(`Resumen secreto ${A.tenantId}`);
    expect(datos).not.toContain(`Resumen secreto ${B.tenantId}`);
  });

  it("una llamada no se prepara", async () => {
    const { status } = await llamar(preparar, { params: { id: A.actividad } });
    expect(status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("una reunión ya hecha no se prepara", async () => {
    await prisma.actividad.update({ where: { id: A.actividad, tenantId: A.tenantId }, data: { tipo: "REUNION", completada: true } });
    const { status } = await llamar(preparar, { params: { id: A.actividad } });
    expect(status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("sin plan de IA no llama a la IA", async () => {
    await volverReunion(A);
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status } = await llamar(preparar, { params: { id: A.actividad } });
    expect(status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("la actividad de otro tenant no existe", async () => {
    await volverReunion(B);
    const { status } = await llamar(preparar, { params: { id: B.actividad } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });
});
