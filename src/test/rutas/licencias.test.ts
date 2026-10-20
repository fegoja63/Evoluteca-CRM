/**
 * Licencias de módulos de pago (Gerente Financiero): solo el panel interno de
 * Evoluteca las da y las revoca; el tenant no puede habilitarse el módulo por
 * su cuenta; la guarda del servidor distingue vigente, vencida y sin licencia.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario, llamar } from "../helpers";
import { estadoLicencia, exigirLicencia } from "@/lib/licencias";
import { fechaDesdeBogota } from "@/lib/fecha-bogota";

import { GET as listar, POST as habilitar } from "@/app/api/admin-evoluteca/tenants/[id]/licencias/route";
import { DELETE as revocar } from "@/app/api/admin-evoluteca/tenants/[id]/licencias/[licenciaId]/route";
import { PATCH as configurar } from "@/app/api/configuracion/route";

const CLAVE = "clave-admin";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ADMIN_REGISTRO_SECRET", CLAVE);
  // El panel admite 10 intentos por IP cada 15 minutos: este archivo hace más
  // llamadas que eso, así que cada prueba arranca con el contador en cero.
  await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "admin-evoluteca:" } } });
  await prisma.licenciaModulo.deleteMany({ where: { tenantId: A.tenantId } });
  await prisma.licenciaModulo.deleteMany({ where: { tenantId: B.tenantId } });
});

function peticion(metodo: string, ruta: string, body?: object, clave: string | null = CLAVE) {
  return new Request(`http://localhost${ruta}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(clave ? { "x-admin-secret": clave } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function darLicencia(tenantId: string, body: object, clave: string | null = CLAVE) {
  const r = await sinAislamiento("panel interno de Evoluteca", () =>
    habilitar(peticion("POST", `/api/admin-evoluteca/tenants/${tenantId}/licencias`, body, clave), {
      params: Promise.resolve({ id: tenantId }),
    }));
  return { status: r.status, cuerpo: await r.json() };
}

const UN_AÑO = { producto: "FINANZAS", desde: "2026-01-01", hasta: "2099-12-31", referenciaPago: "FE-0142" };

describe("habilitar el Gerente Financiero desde el panel interno", () => {
  it("sin la clave del panel no se puede", async () => {
    expect((await darLicencia(A.tenantId, UN_AÑO, null)).status).toBe(403);
    expect((await darLicencia(A.tenantId, UN_AÑO, "otra")).status).toBe(403);
    expect((await estadoLicencia(A.tenantId, "FINANZAS")).estado).toBe("SIN_LICENCIA");
  });

  it("exige la referencia del pago y fechas en orden", async () => {
    expect((await darLicencia(A.tenantId, { ...UN_AÑO, referenciaPago: "  " })).status).toBe(400);
    expect((await darLicencia(A.tenantId, { ...UN_AÑO, desde: "2026-05-01", hasta: "2026-04-30" })).status).toBe(400);
    expect((await darLicencia(A.tenantId, { ...UN_AÑO, producto: "CRM" })).status).toBe(400);
  });

  it("habilitada queda vigente solo para ese cliente", async () => {
    const { status, cuerpo } = await darLicencia(A.tenantId, UN_AÑO);
    expect(status).toBe(201);
    expect(cuerpo.estados.FINANZAS.estado).toBe("VIGENTE");
    expect(cuerpo.historial).toHaveLength(1);
    expect(cuerpo.historial[0].referenciaPago).toBe("FE-0142");

    expect(await exigirLicencia(A.tenantId, "FINANZAS", "editar")).toBeNull();
    const deB = await exigirLicencia(B.tenantId, "FINANZAS", "leer");
    expect(deB?.status).toBe(403);
    expect((await deB!.json()).licencia).toBe("SIN_LICENCIA");
  });

  it("el listado muestra el historial con su estado", async () => {
    await darLicencia(A.tenantId, UN_AÑO);
    const r = await sinAislamiento("panel interno de Evoluteca", () =>
      listar(peticion("GET", `/api/admin-evoluteca/tenants/${A.tenantId}/licencias`), { params: Promise.resolve({ id: A.tenantId }) }));
    expect(r.status).toBe(200);
    const cuerpo = await r.json();
    expect(cuerpo.estados.FINANZAS.estado).toBe("VIGENTE");
    expect(cuerpo.historial).toHaveLength(1);
  });
});

describe("vencimiento y revocación", () => {
  it("vencida: se puede leer pero no editar", async () => {
    await prisma.licenciaModulo.create({
      data: { tenantId: A.tenantId, producto: "FINANZAS", desde: fechaDesdeBogota("2024-01-01"), hasta: fechaDesdeBogota("2024-12-31"), referenciaPago: "FE-0001" },
    });
    expect((await estadoLicencia(A.tenantId, "FINANZAS")).estado).toBe("VENCIDA");
    expect(await exigirLicencia(A.tenantId, "FINANZAS", "leer")).toBeNull();
    const editar = await exigirLicencia(A.tenantId, "FINANZAS", "editar");
    expect(editar?.status).toBe(403);
    expect((await editar!.json()).licencia).toBe("VENCIDA");
  });

  it("revocar la deja sin efecto y conserva la fila en el historial", async () => {
    const { cuerpo } = await darLicencia(A.tenantId, UN_AÑO);
    const id = cuerpo.historial[0].id;
    const r = await sinAislamiento("panel interno de Evoluteca", () =>
      revocar(peticion("DELETE", `/api/admin-evoluteca/tenants/${A.tenantId}/licencias/${id}`), {
        params: Promise.resolve({ id: A.tenantId, licenciaId: id }),
      }));
    expect(r.status).toBe(200);
    expect((await estadoLicencia(A.tenantId, "FINANZAS")).estado).toBe("SIN_LICENCIA");
    const fila = await prisma.licenciaModulo.findFirst({ where: { tenantId: A.tenantId, id } });
    expect(fila?.revocadaEn).not.toBeNull();
  });

  it("no se revoca la licencia de un cliente usando la ruta de otro", async () => {
    const { cuerpo } = await darLicencia(A.tenantId, UN_AÑO);
    const id = cuerpo.historial[0].id;
    const r = await sinAislamiento("panel interno de Evoluteca", () =>
      revocar(peticion("DELETE", `/api/admin-evoluteca/tenants/${B.tenantId}/licencias/${id}`), {
        params: Promise.resolve({ id: B.tenantId, licenciaId: id }),
      }));
    expect(r.status).toBe(404);
    expect((await estadoLicencia(A.tenantId, "FINANZAS")).estado).toBe("VIGENTE");
  });
});

describe("el cliente no puede habilitarse el módulo", () => {
  it("prender 'finanzas' en Configuración no da licencia", async () => {
    const { modulos } = await prisma.tenant.findUniqueOrThrow({ where: { id: A.tenantId }, select: { modulos: true } });
    try {
      comoUsuario(A, "ADMINISTRADOR");
      const { status } = await llamar(configurar, { metodo: "PATCH", body: { modulos: { ...(modulos as object), finanzas: true } } });
      expect(status).toBe(200);
      expect((await estadoLicencia(A.tenantId, "FINANZAS")).estado).toBe("SIN_LICENCIA");
      expect(await exigirLicencia(A.tenantId, "FINANZAS", "leer")).not.toBeNull();
    } finally {
      await prisma.tenant.update({ where: { id: A.tenantId }, data: { modulos: modulos ?? {} } });
    }
  });
});
