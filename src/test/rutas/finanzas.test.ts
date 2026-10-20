/**
 * Gerente Financiero, Fase 1: cargar el estado de resultados mes a mes y el
 * balance. Solo Administrador y Gerente, con licencia (vencida = solo
 * lectura), y cada empresa ve solo sus cifras.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario, llamar } from "../helpers";

import { GET as listarPeriodos, PUT as guardarPeriodos, DELETE as borrarPeriodo } from "@/app/api/finanzas/periodos/route";
import { GET as verBalance, PUT as guardarBalance } from "@/app/api/finanzas/balance/route";
import { POST as importar } from "@/app/api/finanzas/importar/route";
import { GET as plantilla } from "@/app/api/finanzas/plantilla/route";
import { PUT as guardarSupuestos } from "@/app/api/finanzas/supuestos/route";
import { cargarDatosCaja } from "@/lib/finanzas/datos";

const M = 1_000_000;

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await sinAislamiento("limpiar el módulo de finanzas de A y B", async () => {
    const tenants = { tenantId: { in: [A.tenantId, B.tenantId] } };
    await prisma.licenciaModulo.deleteMany({ where: tenants });
    await prisma.periodoFinanciero.deleteMany({ where: tenants });
    await prisma.balanceFinanciero.deleteMany({ where: tenants });
  });
});

async function darLicencia(tenantId: string, vigente = true) {
  await sinAislamiento("dar licencia de prueba", () => prisma.licenciaModulo.create({
    data: vigente
      ? { tenantId, producto: "FINANZAS", desde: new Date("2026-01-01T05:00:00Z"), hasta: new Date("2099-12-31T05:00:00Z"), referenciaPago: "PRUEBA" }
      : { tenantId, producto: "FINANZAS", desde: new Date("2020-01-01T05:00:00Z"), hasta: new Date("2021-01-01T05:00:00Z"), referenciaPago: "PRUEBA" },
  }));
}

const DOS_MESES = {
  periodos: [
    { mes: "2026-02", ventas: 88 * M, costoVentas: 43 * M, gastosAdmin: 30 * M },
    { mes: "2026-01", ventas: 74 * M, costoVentas: 37 * M },
  ],
};

describe("quién entra", () => {
  it("sin licencia, nadie", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(listarPeriodos)).status).toBe(403);
    expect((await llamar(guardarPeriodos, { body: DOS_MESES, metodo: "PUT" })).status).toBe(403);
  });

  it("un comercial no, aunque haya licencia", async () => {
    await darLicencia(A.tenantId);
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(listarPeriodos)).status).toBe(403);
    expect((await llamar(verBalance)).status).toBe(403);
  });

  it("con la licencia vencida se consulta pero no se modifica", async () => {
    await darLicencia(A.tenantId, false);
    comoUsuario(A, "GERENTE");
    expect((await llamar(listarPeriodos)).status).toBe(200);
    expect((await llamar(guardarPeriodos, { body: DOS_MESES, metodo: "PUT" })).status).toBe(403);
  });
});

describe("estado de resultados mes a mes", () => {
  beforeEach(async () => {
    await darLicencia(A.tenantId);
    await darLicencia(B.tenantId);
  });

  it("guarda, devuelve en orden y reemplaza un mes sin duplicarlo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(guardarPeriodos, { body: DOS_MESES, metodo: "PUT" })).status).toBe(200);
    await llamar(guardarPeriodos, { body: { periodos: [{ mes: "2026-01", ventas: 80 * M }] }, metodo: "PUT" });

    const { cuerpo } = await llamar(listarPeriodos);
    const periodos = cuerpo as { mes: string; ventas: number; costoVentas: number }[];
    expect(periodos.map(p => p.mes)).toEqual(["2026-01", "2026-02"]);
    expect(periodos[0].ventas).toBe(80 * M);
    expect(periodos[0].costoVentas).toBe(0);
  });

  it("borra un mes, y no uno que no existe", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(guardarPeriodos, { body: DOS_MESES, metodo: "PUT" });
    expect((await llamar(borrarPeriodo, { query: { mes: "2026-01" }, metodo: "DELETE" })).status).toBe(200);
    expect((await llamar(borrarPeriodo, { query: { mes: "2026-01" }, metodo: "DELETE" })).status).toBe(404);
    expect(((await llamar(listarPeriodos)).cuerpo as unknown[])).toHaveLength(1);
  });

  it("rechaza meses o montos inválidos", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(guardarPeriodos, { body: { periodos: [{ mes: "2026-13", ventas: 1 }] }, metodo: "PUT" })).status).toBe(400);
    expect((await llamar(guardarPeriodos, { body: { periodos: [{ mes: "2026-01", ventas: 1e15 }] }, metodo: "PUT" })).status).toBe(400);
  });

  it("cada empresa ve solo sus cifras", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(guardarPeriodos, { body: DOS_MESES, metodo: "PUT" });
    comoUsuario(B, "ADMINISTRADOR");
    expect((await llamar(listarPeriodos)).cuerpo).toEqual([]);
    // Borrar el mes de A desde B no lo encuentra.
    expect((await llamar(borrarPeriodo, { query: { mes: "2026-01" }, metodo: "DELETE" })).status).toBe(404);
  });
});

describe("balance", () => {
  beforeEach(async () => {
    await darLicencia(A.tenantId);
  });

  it("guarda y devuelve el último corte", async () => {
    comoUsuario(A, "GERENTE");
    await llamar(guardarBalance, { body: { corte: "2026-06-30", caja: 10 * M, patrimonio: 10 * M }, metodo: "PUT" });
    await llamar(guardarBalance, { body: { corte: "2026-09-30", caja: 40 * M, patrimonio: 40 * M }, metodo: "PUT" });
    const { cuerpo } = await llamar(verBalance);
    expect(cuerpo).toMatchObject({ corte: "2026-09-30", caja: 40 * M, patrimonio: 40 * M, deudaLP: 0 });
  });

  it("exige el patrimonio y una fecha válida", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(guardarBalance, { body: { corte: "2026-09-30", caja: 1 }, metodo: "PUT" })).status).toBe(400);
    expect((await llamar(guardarBalance, { body: { corte: "30/09/2026", patrimonio: 1 }, metodo: "PUT" })).status).toBe(400);
  });
});

describe("plantilla", () => {
  beforeEach(async () => {
    await darLicencia(A.tenantId);
  });

  it("lee un CSV en millones sin guardar nada", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const form = new FormData();
    form.append("archivo", new File(["Mes;Ventas;Costo de ventas\n2026-01;74;37\n2026-02;88,5;43\n"], "resultados.csv", { type: "text/csv" }));
    form.append("unidad", "millones");
    const r = await importar(new Request("http://localhost/api/finanzas/importar", { method: "POST", body: form }));
    expect(r.status).toBe(200);
    const { periodos, errores } = await r.json();
    expect(errores).toEqual([]);
    expect(periodos).toHaveLength(2);
    expect(periodos[1].ventas).toBe(88.5 * M);
    expect(await prisma.periodoFinanciero.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });

  it("rechaza otros tipos de archivo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const form = new FormData();
    form.append("archivo", new File(["%PDF"], "estados.pdf", { type: "application/pdf" }));
    const r = await importar(new Request("http://localhost/api/finanzas/importar", { method: "POST", body: form }));
    expect(r.status).toBe(400);
  });

  it("la plantilla descargable trae los 12 meses anteriores", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const r = await plantilla();
    expect(r.headers.get("content-type")).toContain("spreadsheetml");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await r.arrayBuffer());
    const hoja = wb.worksheets[0];
    expect(hoja.getRow(1).getCell(1).value).toBe("Mes");
    expect(hoja.rowCount).toBe(13);
    expect(String(hoja.getRow(13).getCell(1).value)).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("supuestos de la caja proyectada", () => {
  beforeEach(async () => {
    await darLicencia(A.tenantId);
    await sinAislamiento("limpiar supuestos de A", () => prisma.supuestosCaja.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } }));
  });

  const SUPUESTOS = {
    nominaMensual: 40 * M, gastosFijosMensuales: 9 * M, cuotaDeudaMensual: 7 * M, proveedoresSemanales: 18 * M,
    impuestosMensuales: 11 * M, ventasContadoSemanales: 14 * M, diasCobro: 45,
  };

  it("los guarda y los reemplaza (uno por empresa)", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(guardarSupuestos, { body: SUPUESTOS, metodo: "PUT" })).status).toBe(200);
    expect((await llamar(guardarSupuestos, { body: { ...SUPUESTOS, diasCobro: 30 }, metodo: "PUT" })).status).toBe(200);
    const filas = await prisma.supuestosCaja.findMany({ where: { tenantId: A.tenantId } });
    expect(filas).toHaveLength(1);
    expect(filas[0].diasCobro).toBe(30);
    expect(Number(filas[0].nominaMensual)).toBe(40 * M);
  });

  it("rechaza montos negativos y días imposibles", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(guardarSupuestos, { body: { ...SUPUESTOS, nominaMensual: -1 }, metodo: "PUT" })).status).toBe(400);
    expect((await llamar(guardarSupuestos, { body: { ...SUPUESTOS, diasCobro: 999 }, metodo: "PUT" })).status).toBe(400);
  });

  it("un comercial no, y sin licencia nadie", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(guardarSupuestos, { body: SUPUESTOS, metodo: "PUT" })).status).toBe(403);
    comoUsuario(B, "ADMINISTRADOR");
    expect((await llamar(guardarSupuestos, { body: SUPUESTOS, metodo: "PUT" })).status).toBe(403);
  });

  it("la caja usa el pipeline del CRM de la empresa, no el de otra ni en una cuenta solo Finanzas", async () => {
    await sinAislamiento("negocio con valor y cierre para A", () => prisma.oportunidad.update({
      where: { id: A.oportunidadDelComercial }, data: { valor: 48 * M, probabilidad: 70, fechaCierre: new Date("2026-11-05T05:00:00Z") },
    }));
    const datosA = await cargarDatosCaja(A.tenantId);
    expect(datosA.pipeline).toEqual([expect.objectContaining({ id: A.oportunidadDelComercial, titulo: expect.stringContaining("Oportunidad del comercial"), etapa: "PROSPECTO", valor: 48 * M, probabilidad: 70, fechaCierre: "2026-11-05" })]);
    expect(datosA.supuestosGuardados).toBe(false);
    expect((await cargarDatosCaja(B.tenantId)).pipeline).toEqual([]);

    await sinAislamiento("A pasa a solo Finanzas", () => prisma.tenant.update({ where: { id: A.tenantId }, data: { soloFinanzas: true } }));
    expect((await cargarDatosCaja(A.tenantId)).pipeline).toEqual([]);
  });
});
