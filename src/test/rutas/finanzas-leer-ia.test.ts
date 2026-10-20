/**
 * Gerente Financiero: leer con IA los estados del contador (PDF, foto o
 * Excel). La API de Claude se simula. Se verifica qué se le pide al modelo,
 * que no se guarda nada, el acceso (rol y licencia) y el cupo de IA.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import ExcelJS from "exceljs";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario } from "../helpers";

const parse = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error { status = 500; }
  class RateLimitError extends APIError {}
  class BadRequestError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    static BadRequestError = BadRequestError;
    beta = { messages: { parse } };
  }
  return { default: Anthropic };
});

import { POST as leer } from "@/app/api/finanzas/leer-ia/route";

const M = 1_000_000;
const ceros = { ventas: 0, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0 };
const respuestaIA = {
  stop_reason: "end_turn",
  usage: { input_tokens: 4000, output_tokens: 800 },
  parsed_output: {
    unidadDocumento: "miles",
    meses: [],
    acumulado: { desde: "2025-01", hasta: "2025-12", ...ceros, ventas: 1418 * M, costoVentas: -689 * M },
    balance: { corte: "2025-12-31", caja: 40 * M, cuentasPorCobrar: 96 * M, inventario: 6 * M, otrosActivosCorrientes: 10 * M,
      activosFijos: 340 * M, proveedores: 48 * M, obligacionesCP: 30 * M, impuestosLaborales: 36 * M, deudaLP: 160 * M, patrimonio: 218 * M },
    advertencias: ["Los gastos de ventas vienen sumados con los de administración."],
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
  await sinAislamiento("preparar licencia y contadores del tenant A", async () => {
    await prisma.licenciaModulo.deleteMany({ where: { tenantId: A.tenantId } });
    await prisma.usoIA.deleteMany({ where: { tenantId: A.tenantId } });
    await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "ia-finanzas:" } } });
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 100 } });
    await prisma.licenciaModulo.create({ data: { tenantId: A.tenantId, producto: "FINANZAS", desde: new Date("2026-01-01T05:00:00Z"), hasta: new Date("2099-12-31T05:00:00Z"), referenciaPago: "PRUEBA" } });
  });
});

function subir(archivo: File) {
  const form = new FormData();
  form.append("archivo", archivo);
  return leer(new Request("http://localhost/api/finanzas/leer-ia", { method: "POST", body: form }));
}
const pdf = () => new File(["%PDF-1.4 estados"], "estados-2025.pdf", { type: "application/pdf" });

describe("leer los estados del contador con IA", () => {
  it("manda el PDF a claude-opus-5-5 con salida estructurada y respaldo, y devuelve la propuesta limpia", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const r = await subir(pdf());
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.acumulado).toMatchObject({ desde: "2025-01", hasta: "2025-12", costoVentas: 689 * M });
    expect(cuerpo.balance).toMatchObject({ corte: "2025-12-31", patrimonio: 218 * M });
    expect(cuerpo.advertencias).toHaveLength(1);
    expect(cuerpo.unidadDocumento).toBe("miles");

    const pedido = parse.mock.calls[0][0];
    expect(pedido.model).toBe("claude-opus-5-5");
    expect(pedido.fallbacks).toEqual([{ model: "claude-opus-4-8" }]);
    expect(pedido.output_config.format).toBeTruthy();
    expect(pedido.messages[0].content[0]).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
  });

  it("no guarda nada y cuenta una acción de IA", async () => {
    comoUsuario(A, "GERENTE");
    await subir(pdf());
    expect(await prisma.periodoFinanciero.count({ where: { tenantId: A.tenantId } })).toBe(0);
    expect(await prisma.balanceFinanciero.count({ where: { tenantId: A.tenantId } })).toBe(0);
    const uso = await prisma.usoIA.findFirst({ where: { tenantId: A.tenantId } });
    expect(uso?.cantidad).toBe(1);
  });

  it("un Excel del contador se le pasa como texto", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("PyG").addRows([["Cuenta", "2025"], ["Ingresos operacionales", 1418000000]]);
    const buffer = await wb.xlsx.writeBuffer();
    const r = await subir(new File([buffer as ArrayBuffer], "pyg.xlsx"));
    expect(r.status).toBe(200);
    const bloque = parse.mock.calls[0][0].messages[0].content[0];
    expect(bloque.type).toBe("text");
    expect(bloque.text).toContain("Ingresos operacionales | 1418000000");
  });

  it("una foto va como imagen", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await subir(new File([new Uint8Array([137, 80, 78, 71])], "balance.png", { type: "image/png" }));
    expect(parse.mock.calls[0][0].messages[0].content[0]).toMatchObject({ type: "image", source: { media_type: "image/png" } });
  });

  it("rechaza otros formatos sin llamar a la IA", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const r = await subir(new File(["hola"], "estados.docx"));
    expect(r.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("un comercial no puede, aunque haya licencia", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await subir(pdf())).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("respeta el cupo mensual de IA", async () => {
    await sinAislamiento("cupo de IA agotado", () => prisma.tenant.update({ where: { id: A.tenantId }, data: { limiteResumenesIA: 0 } }));
    comoUsuario(A, "ADMINISTRADOR");
    expect((await subir(pdf())).status).toBe(403);
    expect(parse).not.toHaveBeenCalled();
  });

  it("si la IA declina, lo dice sin contar el cupo", async () => {
    parse.mockResolvedValue({ ...respuestaIA, stop_reason: "refusal", parsed_output: null });
    comoUsuario(A, "ADMINISTRADOR");
    expect((await subir(pdf())).status).toBe(422);
    expect(await prisma.usoIA.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });
});
