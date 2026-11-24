/**
 * Informe de análisis financiero: se genera con las cifras del propio tenant,
 * se guarda, cuenta una acción de IA, solo lo ven/generan Administrador y
 * Gerente con licencia, y el PDF sale solo para la propia cuenta.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
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

import { GET as listar, POST as generar } from "@/app/api/finanzas/informe/route";
import { GET as pdf } from "@/app/api/finanzas/informe/pdf/route";

const M = 1_000_000;
const textoIA = {
  titulo: "Septiembre creció, pero la caja queda justa",
  resumenEjecutivo: "Las ventas subieron 13 % frente a agosto.",
  decisionesUrgentes: ["Cobrar la cartera vencida", "Revisar gastos", "Cerrar el negocio más grande", "una cuarta que sobra"],
  resultados: ["Las ventas fueron $136 M.", "  "],
  balanceIndicadores: ["La liquidez es de 1,3 veces."],
  caja: ["El punto más bajo llega en noviembre."],
  clientes: [],
  recomendaciones: [{ accion: "Cobrar la cartera", porque: "Hay $96 M por cobrar", impacto: "Hasta $40 M de caja" }],
  preguntasContador: ["¿La depreciación está completa?"],
};
const respuestaIA = { stop_reason: "end_turn", usage: { input_tokens: 5000, output_tokens: 1500 }, parsed_output: textoIA };

const pedir = (url: string) => new Request(`http://localhost${url}`);

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  parse.mockReset();
  parse.mockResolvedValue(respuestaIA);
  process.env.ANTHROPIC_API_KEY = "clave-de-prueba";
  await sinAislamiento("preparar finanzas de A y B", async () => {
    await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "ia-informe:" } } });
    for (const t of [A, B]) {
      const w = { tenantId: t.tenantId };
      await prisma.informeFinanciero.deleteMany({ where: w });
      await prisma.licenciaModulo.deleteMany({ where: w });
      await prisma.periodoFinanciero.deleteMany({ where: w });
      await prisma.balanceFinanciero.deleteMany({ where: w });
      await prisma.usoIA.deleteMany({ where: w });
      await prisma.tenant.update({ where: { id: t.tenantId }, data: { limiteResumenesIA: 100 } });
      await prisma.licenciaModulo.create({ data: { ...w, producto: "FINANZAS", desde: new Date("2026-01-01T05:00:00Z"), hasta: new Date("2099-12-31T05:00:00Z"), referenciaPago: "PRUEBA" } });
    }
    const a = { tenantId: A.tenantId };
    await prisma.periodoFinanciero.createMany({ data: [
      { ...a, mes: "2025-09", ventas: 100 * M, costoVentas: 50 * M, gastosAdmin: 30 * M },
      { ...a, mes: "2026-08", ventas: 120 * M, costoVentas: 60 * M, gastosAdmin: 32 * M },
      { ...a, mes: "2026-09", ventas: 136 * M, costoVentas: 65 * M, gastosAdmin: 33 * M },
    ] });
    await prisma.balanceFinanciero.create({ data: { ...a, corte: new Date("2026-09-30T05:00:00Z"), caja: 40 * M, cuentasPorCobrar: 96 * M, patrimonio: 136 * M } });
    await prisma.periodoFinanciero.create({ data: { tenantId: B.tenantId, mes: "2026-09", ventas: 999 * M } });
  });
});

describe("informe de análisis financiero", () => {
  it("se genera con las cifras del mes, el anterior y el año pasado, se guarda y cuenta una acción", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(generar, {});
    expect(status).toBe(201);
    const informe = (cuerpo as { informe: { id: string; mes: string; cifras: { actual: { ventas: number }; anterior: { mes: string }; anioAnterior: { mes: string } }; texto: typeof textoIA } }).informe;
    expect(informe.mes).toBe("2026-09");
    expect(informe.cifras.actual.ventas).toBe(136 * M);
    expect(informe.cifras.anterior.mes).toBe("2026-08");
    expect(informe.cifras.anioAnterior.mes).toBe("2025-09");
    // La IA recibe las cifras de A (en millones) y nunca las de B.
    const datos = parse.mock.calls[0][0].messages[0].content as string;
    expect(datos).toContain("\"mismoMesDelAnioPasado\"");
    expect(datos).not.toContain("999");
    expect(parse.mock.calls[0][0].model).toBe("claude-opus-5-5");
    // Se limpia: máximo 3 decisiones y sin párrafos vacíos.
    expect(informe.texto.decisionesUrgentes).toHaveLength(3);
    expect(informe.texto.resultados).toEqual(["Las ventas fueron $136 M."]);
    const uso = await prisma.usoIA.findMany({ where: { tenantId: A.tenantId } });
    expect(uso.reduce((s, u) => s + u.cantidad, 0)).toBe(1);
    expect(await prisma.informeFinanciero.count({ where: { tenantId: A.tenantId } })).toBe(1);
  });

  it("el historial y el PDF son solo de la propia cuenta", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const id = ((await llamar(generar, {})).cuerpo as { informe: { id: string } }).informe.id;
    const lista = (await llamar(listar, {})).cuerpo as { informes: { id: string }[] };
    expect(lista.informes.map(i => i.id)).toEqual([id]);

    const r = await pdf(pedir(`/api/finanzas/informe/pdf?id=${id}`));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(1000);

    comoUsuario(B, "ADMINISTRADOR");
    expect((await pdf(pedir(`/api/finanzas/informe/pdf?id=${id}`))).status).toBe(404);
    expect(((await llamar(listar, {})).cuerpo as { informes: unknown[] }).informes).toHaveLength(0);
  }, 60_000);

  it("un comercial no puede generarlo ni verlo", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(generar, {})).status).toBe(403);
    expect((await llamar(listar, {})).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("sin meses cargados o sin cupo no llama a la IA", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    await sinAislamiento("dejar a B sin meses", () => prisma.periodoFinanciero.deleteMany({ where: { tenantId: B.tenantId } }));
    expect((await llamar(generar, {})).status).toBe(400);
    comoUsuario(A, "ADMINISTRADOR");
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } });
    expect((await llamar(generar, {})).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });
});
