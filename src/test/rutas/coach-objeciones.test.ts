/**
 * Coach de objeciones con IA: usa la metodología de ventas del tenant y la guía
 * de objeciones completa del equipo (solo la suya), y pide "qué falta calificar"
 * y "pregunta para destrabar". La metodología solo la cambia el Administrador y
 * solo a un valor conocido.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

// La API de Claude se simula: no gasta cupo ni depende de la red, y se puede
// ver qué se le pide al modelo.
type Peticion = { system: string; messages: { content: string }[]; max_tokens: number };
const stream = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic { messages = { stream }; }
  return { default: Anthropic };
});

import { POST as coach } from "@/app/api/ia/objecion-coach/route";
import { PATCH as configurar } from "@/app/api/configuracion/route";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba");
  stream.mockReset();
  stream.mockImplementation(() => {
    const ms = {
      on: (_evento: string, cb: (t: string) => void) => { cb("RESPUESTA SUGERIDA:\nok"); return ms; },
      finalMessage: async () => ({ usage: { input_tokens: 10, output_tokens: 10 } }),
    };
    return ms;
  });
});

async function pedirCoach(objecion: string): Promise<Peticion> {
  const { respuesta } = await llamar(coach, { body: { oportunidadId: A.oportunidadDelComercial, objecion } });
  expect(respuesta.status).toBe(200);
  await respuesta.text(); // consume el stream para que termine
  expect(stream).toHaveBeenCalledTimes(1);
  return stream.mock.calls[0][0] as Peticion;
}

describe("Coach de objeciones", () => {
  beforeEach(() => comoUsuario(A, "ADMINISTRADOR"));

  it("por defecto responde con enfoque consultivo y pide qué falta calificar y la pregunta para destrabar", async () => {
    const p = await pedirCoach("Está muy caro");
    expect(p.system).toContain("Venta consultiva");
    expect(p.system).toContain("QUÉ FALTA CALIFICAR:");
    expect(p.system).toContain("PREGUNTA PARA DESTRABAR:");
  });

  it("usa la metodología que el tenant eligió", async () => {
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { metodologiaVentas: "SPIN" } });
    const p = await pedirCoach("No lo necesitamos ahora");
    expect(p.system).toContain("SPIN Selling");
    expect(p.system).not.toContain("Venta consultiva:");
  });

  it("le pasa la guía completa del equipo, no solo la coincidencia exacta, y nunca la de otro cliente", async () => {
    const p = await pedirCoach("Ustedes son muy costosos");
    const contenido = p.messages[0].content;
    expect(contenido).toContain("GUÍA DE OBJECIONES DEL EQUIPO");
    expect(contenido).toContain("Objecion de"); // la entrada sembrada de A, aunque no coincide palabra por palabra
    const deB = await prisma.objecion.findFirstOrThrow({ where: { id: B.objecion, tenantId: B.tenantId } });
    expect(contenido).not.toContain(deB.objecion);
    // Exactamente las entradas activas de A (la semilla usa el mismo texto de
    // respuesta en A y B, así que se cuentan líneas en vez de buscar ese texto).
    const deA = await prisma.objecion.count({ where: { tenantId: A.tenantId, activa: true } });
    const lineasGuia = contenido.split("GUÍA DE OBJECIONES DEL EQUIPO")[1].split("\n").filter(l => l.startsWith("- \""));
    expect(lineasGuia).toHaveLength(deA);
  });
});

describe("Metodología en Configuración", () => {
  it("el Administrador la cambia a un valor conocido", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(configurar, { body: { metodologiaVentas: "CHALLENGER" }, metodo: "PATCH" });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ metodologiaVentas: "CHALLENGER" });
  });

  it("un valor desconocido se rechaza y no cambia nada", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(configurar, { body: { metodologiaVentas: "INVENTADA" }, metodo: "PATCH" });
    expect(status).toBe(400);
    const t = await prisma.tenant.findUniqueOrThrow({ where: { id: A.tenantId }, select: { metodologiaVentas: true } });
    expect(t.metodologiaVentas).toBe("CONSULTIVA");
  });

  it("un Gerente no puede cambiarla", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(configurar, { body: { metodologiaVentas: "VALOR" }, metodo: "PATCH" });
    expect(status).toBe(403);
  });
});
