/**
 * Minutas de reunión con IA: generar (con la API de Claude simulada), guardar
 * (minuta + reunión + tareas + línea de tiempo), listar, eliminar y aislamiento
 * entre clientes.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

// La API de Claude se simula: las pruebas no gastan cupo ni dependen de la red,
// y se puede verificar qué se le pide al modelo.
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

import { POST as generar } from "@/app/api/ia/minuta/route";
import { GET as listar, POST as guardar } from "@/app/api/minutas/route";
import { DELETE as eliminar } from "@/app/api/minutas/[id]/route";

const NOTAS = "Reunión con Ana (gerente del cliente). Quedamos en enviar la propuesta ajustada el viernes. Ellos confirman presupuesto.";

const respuestaIA = {
  stop_reason: "end_turn",
  usage: { input_tokens: 500, output_tokens: 300 },
  parsed_output: {
    titulo: "Revisión de propuesta",
    resumen: "Se revisó la propuesta y se acordó ajustarla.",
    asistentes: [{ nombre: "Ana", rol: "Gerente", lado: "CLIENTE" }],
    acuerdos: ["Ajustar la propuesta"],
    compromisos: [
      { descripcion: "Enviar propuesta ajustada", responsable: null, lado: "NOSOTROS", fecha: "2026-09-26" },
      { descripcion: "Confirmar presupuesto", responsable: "Ana", lado: "CLIENTE", fecha: null },
    ],
    proximosPasos: ["Reunión de cierre"],
    riesgos: ["Precio"],
  },
};

const minutaParaGuardar = (extra: Record<string, unknown> = {}) => ({
  oportunidadId: A.oportunidadDelComercial,
  fecha: "2026-09-24",
  titulo: "Revisión de propuesta",
  resumen: "Se revisó la propuesta y se acordó ajustarla.",
  asistentes: [{ nombre: "Ana", rol: "Gerente", lado: "CLIENTE" }],
  acuerdos: ["Ajustar la propuesta"],
  compromisos: [
    { descripcion: "Enviar propuesta ajustada", responsable: null, lado: "NOSOTROS", fecha: "2026-09-26", crearTarea: true },
    { descripcion: "Preparar demo", responsable: null, lado: "NOSOTROS", fecha: null, crearTarea: false },
    { descripcion: "Confirmar presupuesto", responsable: "Ana", lado: "CLIENTE", fecha: null, crearTarea: true },
  ],
  proximosPasos: ["Reunión de cierre"],
  riesgos: ["Precio"],
  textoOriginal: NOTAS,
  ...extra,
});

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  parse.mockReset();
  parse.mockResolvedValue(respuestaIA);
  process.env.ANTHROPIC_API_KEY = "clave-de-prueba";
});

describe("generar la minuta con IA", () => {
  it("pide structured outputs a claude-opus-5 con respaldo y devuelve la propuesta limpia", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(generar, {
      metodo: "POST", body: { texto: NOTAS, fecha: "2026-09-24", oportunidadId: A.oportunidadDelComercial },
    });
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ titulo: "Revisión de propuesta", acuerdos: ["Ajustar la propuesta"] });

    const pedido = parse.mock.calls[0][0];
    expect(pedido.model).toBe("claude-opus-5");
    expect(pedido.fallbacks).toEqual([{ model: "claude-opus-4-8" }]);
    expect(pedido.betas).toContain("server-side-fallback-2026-06-01");
    expect(pedido.output_config.format).toBeTruthy();
    expect(pedido.messages[0].content).toContain("<notas>");
  });

  it("cuenta una acción del cupo mensual de IA", async () => {
    comoUsuario(A, "COMERCIAL");
    await llamar(generar, { metodo: "POST", body: { texto: NOTAS, fecha: "2026-09-24", oportunidadId: A.oportunidadDelComercial } });
    const uso = await prisma.usoIA.findFirst({ where: { tenantId: A.tenantId } });
    expect(uso?.cantidad).toBe(1);
  });

  it("valida el texto y no llama a la IA si falta", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(generar, { metodo: "POST", body: { texto: "corto", fecha: "2026-09-24", oportunidadId: A.oportunidadDelComercial } });
    expect(status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("si el modelo declina, responde un error claro", async () => {
    parse.mockResolvedValue({ ...respuestaIA, stop_reason: "refusal", parsed_output: null });
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(generar, { metodo: "POST", body: { texto: NOTAS, fecha: "2026-09-24", oportunidadId: A.oportunidadDelComercial } });
    expect(status).toBe(422);
  });

  it("el cliente B no puede generar una minuta sobre un negocio del cliente A", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(generar, { metodo: "POST", body: { texto: NOTAS, fecha: "2026-09-24", oportunidadId: A.oportunidadDelComercial } });
    expect(status).toBe(404);
    expect(parse).not.toHaveBeenCalled();
  });
});

describe("guardar la minuta revisada", () => {
  it("guarda la minuta, la reunión completada, solo las tareas marcadas de nuestro lado y el evento del cliente", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(guardar, { metodo: "POST", body: minutaParaGuardar() });
    expect(status).toBe(201);
    const creada = cuerpo as { id: string; actividadId: string; tareasCreadas: number; empresaId: string };
    expect(creada.tareasCreadas).toBe(1);
    expect(creada.empresaId).toBe(A.empresa); // se deriva de la oportunidad

    const reunion = await prisma.actividad.findFirst({ where: { id: creada.actividadId, tenantId: A.tenantId } });
    expect(reunion).toMatchObject({ tipo: "REUNION", completada: true, oportunidadId: A.oportunidadDelComercial });

    const tareas = await prisma.actividad.findMany({
      where: { tenantId: A.tenantId, oportunidadId: A.oportunidadDelComercial, tipo: "TAREA", completada: false, titulo: { in: ["Enviar propuesta ajustada", "Preparar demo", "Confirmar presupuesto"] } },
    });
    expect(tareas.map(t => t.titulo)).toEqual(["Enviar propuesta ajustada"]);

    const evento = await prisma.eventoTimeline.findFirst({ where: { tenantId: A.tenantId, empresaId: A.empresa, titulo: "Minuta: Revisión de propuesta" } });
    expect(evento).not.toBeNull();

    const guardada = await prisma.minuta.findFirst({ where: { id: creada.id, tenantId: A.tenantId } });
    expect(JSON.stringify(guardada?.compromisos)).not.toContain("crearTarea");
  });

  it("valida los datos (fecha y título)", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(guardar, { metodo: "POST", body: minutaParaGuardar({ fecha: "mañana" }) })).status).toBe(400);
    expect((await llamar(guardar, { metodo: "POST", body: minutaParaGuardar({ titulo: "" }) })).status).toBe(400);
  });

  it("el cliente B no puede guardar una minuta en un negocio del cliente A", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(guardar, { metodo: "POST", body: minutaParaGuardar() });
    expect(status).toBe(404);
    expect(await prisma.minuta.count({ where: { tenantId: B.tenantId } })).toBe(1); // solo la sembrada
  });
});

describe("listar y eliminar", () => {
  it("lista las minutas del negocio y del cliente; el cliente B no ve las del cliente A", async () => {
    comoUsuario(A, "COMERCIAL");
    const porNegocio = await llamar(listar, { query: { oportunidadId: A.oportunidadDelComercial } });
    expect((porNegocio.cuerpo as { id: string }[]).map(m => m.id)).toEqual([A.minuta]);
    const porCliente = await llamar(listar, { query: { empresaId: A.empresa } });
    expect((porCliente.cuerpo as { id: string }[]).map(m => m.id)).toEqual([A.minuta]);

    comoUsuario(B, "ADMINISTRADOR");
    const deB = await llamar(listar, { query: { oportunidadId: A.oportunidadDelComercial } });
    expect(deB.cuerpo).toEqual([]);
  });

  it("solo quien la creó, un Gerente o un Administrador pueden eliminarla; conserva la reunión", async () => {
    comoUsuario(A, "COMERCIAL");
    const { cuerpo } = await llamar(guardar, { metodo: "POST", body: minutaParaGuardar() });
    const creada = cuerpo as { id: string; actividadId: string };

    // La sembrada es del comercial: el comercial SÍ puede; se prueba con otra creada por el admin.
    comoUsuario(A, "ADMINISTRADOR");
    const delAdmin = await llamar(guardar, { metodo: "POST", body: minutaParaGuardar({ titulo: "Del admin" }) });
    comoUsuario(A, "COMERCIAL");
    const sinPermiso = await llamar(eliminar, { metodo: "DELETE", params: { id: (delAdmin.cuerpo as { id: string }).id } });
    expect(sinPermiso.status).toBe(403);

    const ok = await llamar(eliminar, { metodo: "DELETE", params: { id: creada.id } });
    expect(ok.status).toBe(200);
    expect(await prisma.minuta.findFirst({ where: { id: creada.id, tenantId: A.tenantId } })).toBeNull();
    expect(await prisma.actividad.findFirst({ where: { id: creada.actividadId, tenantId: A.tenantId } })).not.toBeNull();
  });

  it("el cliente B no puede eliminar una minuta del cliente A", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(eliminar, { metodo: "DELETE", params: { id: A.minuta } });
    expect(status).toBe(404);
    expect(await prisma.minuta.findFirst({ where: { id: A.minuta, tenantId: A.tenantId } })).not.toBeNull();
  });
});
