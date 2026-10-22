/**
 * Revisor de propuestas: los chequeos fijos salen siempre (también sin IA o
 * sin cupo), la IA recibe la metodología del tenant y solo datos de su propia
 * cotización, y nunca se revisa la cotización de otro cliente.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

// La API de Claude se simula: no gasta cupo ni depende de la red.
type Peticion = { model: string; system: string; messages: { content: string }[] };
type Respuesta = { chequeos: unknown[]; ia: Record<string, unknown> | null; iaMensaje: string | null };
const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; }
  return { default: Anthropic };
});

import { POST as revisar } from "@/app/api/ia/revisar-propuesta/route";

const RESPUESTA_IA = {
  veredicto: "AJUSTAR",
  resumen: " Conviene mostrar el ahorro. ",
  observaciones: [{ tipo: "objecion", titulo: "Precio", detalle: "El cliente dijo que está caro." }],
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

describe("Revisor de propuestas", () => {
  it("devuelve los chequeos y la lectura de la IA, con la metodología del tenant", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { metodologiaVentas: "SPIN" } });
    const { status, cuerpo: c } = await llamar(revisar, { body: { cotizacionId: A.cotizacion } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.ia).toMatchObject({ veredicto: "AJUSTAR", resumen: "Conviene mostrar el ahorro." });
    expect(Array.isArray(cuerpo.chequeos)).toBe(true);
    expect(parse).toHaveBeenCalledTimes(1);
    const p = parse.mock.calls[0][0] as Peticion;
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.system).toContain("SPIN Selling");
    expect(p.messages[0].content).toContain("Item de"); // los ítems de su cotización
  });

  it("detecta el descuento frente al catálogo del propio tenant", async () => {
    const prod = await prisma.producto.findFirstOrThrow({ where: { id: A.producto, tenantId: A.tenantId } });
    await prisma.itemCotizacion.update({ where: { id: A.itemCotizacion }, data: { descripcion: prod.nombre } });
    const { cuerpo: c } = await llamar(revisar, { body: { cotizacionId: A.cotizacion } });
    const cuerpo = c as Respuesta;
    // Semilla: lista $1.000, propuesta $500.
    expect(cuerpo.chequeos).toContainEqual(expect.objectContaining({ nivel: "alerta", titulo: `Descuento de 50% en "${prod.nombre}"` }));
  });

  it("sin clave de IA igual devuelve los chequeos y no llama a la IA", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { status, cuerpo: c } = await llamar(revisar, { body: { cotizacionId: A.cotizacion } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.ia).toBeNull();
    expect(cuerpo.iaMensaje).toBeTruthy();
    expect(parse).not.toHaveBeenCalled();
  });

  it("si la IA no está en el plan, devuelve los chequeos con el aviso", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    const { status, cuerpo: c } = await llamar(revisar, { body: { cotizacionId: A.cotizacion } });
    const cuerpo = c as Respuesta;
    expect(status).toBe(200);
    expect(cuerpo.ia).toBeNull();
    expect(cuerpo.iaMensaje).toContain("no están incluidas en su plan");
    expect(parse).not.toHaveBeenCalled();
  });

  it("la cotización de otro cliente no existe para este tenant", async () => {
    const { status } = await llamar(revisar, { body: { cotizacionId: B.cotizacion } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });

  it("cuenta el uso de IA del mes", async () => {
    const antes = await prisma.usoIA.aggregate({ where: { tenantId: A.tenantId }, _sum: { cantidad: true } });
    await llamar(revisar, { body: { cotizacionId: A.cotizacion } });
    const despues = await prisma.usoIA.aggregate({ where: { tenantId: A.tenantId }, _sum: { cantidad: true } });
    expect((despues._sum.cantidad ?? 0) - (antes._sum.cantidad ?? 0)).toBe(1);
  });
});
