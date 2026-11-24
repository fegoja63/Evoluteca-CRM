/**
 * Gerente Financiero: cierres anuales (el estado de resultados de un año
 * completo, como lo entrega el contador). Solo Administrador y Gerente, con
 * licencia, y cada empresa ve solo sus cierres.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario, llamar } from "../helpers";
import { GET as listar, PUT as guardar, DELETE as borrar } from "@/app/api/finanzas/cierres/route";
import { cargarDatosFinancieros, indicadoresDe } from "@/lib/finanzas/datos";

const M = 1_000_000;

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await sinAislamiento("limpiar cierres y licencias de A y B", async () => {
    const tenants = { tenantId: { in: [A.tenantId, B.tenantId] } };
    await prisma.licenciaModulo.deleteMany({ where: tenants });
    await prisma.cierreAnual.deleteMany({ where: tenants });
    await prisma.periodoFinanciero.deleteMany({ where: tenants });
    await prisma.balanceFinanciero.deleteMany({ where: tenants });
    await prisma.tenant.updateMany({ where: { id: { in: [A.tenantId, B.tenantId] } }, data: { actividadFinanciera: null } });
  });
});

async function darLicencia(tenantId: string) {
  await sinAislamiento("dar licencia de prueba", () => prisma.licenciaModulo.create({
    data: { tenantId, producto: "FINANZAS", desde: new Date("2026-01-01T05:00:00Z"), hasta: new Date("2099-12-31T05:00:00Z"), referenciaPago: "PRUEBA" },
  }));
}

const DOS_ANIOS = {
  cierres: [
    { anio: 2025, ventas: 2299.4 * M, gastosAdmin: 1664 * M, gastosVentas: 130.8 * M, depreciacion: 79.9 * M, intereses: 33.9 * M,
      otrosIngresos: 29.3 * M, otrosGastos: 315.2 * M, impuestoRenta: 180 * M },
    { anio: 2024, ventas: 2117.6 * M, gastosAdmin: 1380 * M, impuestoRenta: 201.5 * M },
  ],
  actividad: "Arrendamiento de bienes inmuebles y alquiler de un teatro.",
};

describe("cierres anuales", () => {
  it("sin licencia o como comercial, no", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(guardar, { body: DOS_ANIOS, metodo: "PUT" })).status).toBe(403);
    await darLicencia(A.tenantId);
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(listar)).status).toBe(403);
  });

  it("guarda los años y la actividad, los devuelve en orden y reemplaza sin duplicar", async () => {
    await darLicencia(A.tenantId);
    comoUsuario(A, "GERENTE");
    expect((await llamar(guardar, { body: DOS_ANIOS, metodo: "PUT" })).status).toBe(200);
    await llamar(guardar, { body: { cierres: [{ ...DOS_ANIOS.cierres[1], ventas: 2200 * M }] }, metodo: "PUT" });
    const { cuerpo } = await llamar(listar);
    const cierres = cuerpo as { mes: string; ventas: number; impuestoRenta: number | null; otrosGastos: number }[];
    expect(cierres.map(c => c.mes)).toEqual(["2024", "2025"]);
    expect(cierres[0].ventas).toBe(2200 * M);
    expect(cierres[1]).toMatchObject({ otrosGastos: 315.2 * M, impuestoRenta: 180 * M });
    const t = await sinAislamiento("leer la actividad", () => prisma.tenant.findUnique({ where: { id: A.tenantId }, select: { actividadFinanciera: true } }));
    expect(t?.actividadFinanciera).toContain("Arrendamiento");
  });

  it("el análisis pasa a anual y la utilidad es la real (pérdida)", async () => {
    await darLicencia(A.tenantId);
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(guardar, { body: DOS_ANIOS, metodo: "PUT" });
    const datos = await cargarDatosFinancieros(A.tenantId);
    expect(datos.modo).toBe("anual");
    expect(datos.actividad).toContain("teatro");
    const margen = indicadoresDe(datos).find(i => i.clave === "margenNeto");
    expect(margen?.valor).toBeLessThan(0);
  });

  it("cada empresa ve solo sus cierres; borrar el de otra da 404", async () => {
    await darLicencia(A.tenantId);
    await darLicencia(B.tenantId);
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(guardar, { body: DOS_ANIOS, metodo: "PUT" });
    comoUsuario(B, "ADMINISTRADOR");
    expect((await llamar(listar)).cuerpo).toEqual([]);
    expect((await llamar(borrar, { query: { anio: "2025" }, metodo: "DELETE" })).status).toBe(404);
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(borrar, { query: { anio: "2025" }, metodo: "DELETE" })).status).toBe(200);
    expect(((await llamar(listar)).cuerpo as unknown[]).length).toBe(1);
  });

  it("valida año y montos", async () => {
    await darLicencia(A.tenantId);
    comoUsuario(A, "ADMINISTRADOR");
    expect((await llamar(guardar, { body: { cierres: [{ anio: 1990, ventas: 1 }] }, metodo: "PUT" })).status).toBe(400);
    expect((await llamar(guardar, { body: { cierres: [{ anio: 2025, ventas: 1e15 }] }, metodo: "PUT" })).status).toBe(400);
    expect((await llamar(borrar, { query: { anio: "abc" }, metodo: "DELETE" })).status).toBe(400);
  });
});
