/**
 * Aviso de vencimiento de licencia: el día del aviso, el cron diario le
 * escribe a Evoluteca (no al cliente) una sola vez; cambiar la fecha desde el
 * panel lo vuelve a armar.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";

type Envio = { to: string; subject: string; html: string };
const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => {
  class Resend { emails = { send }; }
  return { Resend };
});

import { GET as cron } from "@/app/api/cron/notificaciones/route";
import { PATCH as editarTenant } from "@/app/api/admin-evoluteca/tenants/[id]/route";

const BUZON = "avisos@evoluteca.test";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
  vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
  vi.stubEnv("ADMIN_REGISTRO_SECRET", "clave-admin");
  vi.stubEnv("AVISOS_EVOLUTECA_A", BUZON);
  send.mockReset();
  send.mockResolvedValue({ error: null });
});

// Solo lo enviado en ESTA corrida del cron.
async function correrCron(): Promise<Envio[]> {
  send.mockClear();
  const r = await sinAislamiento("el cron recorre todos los tenants", () =>
    cron(new Request("http://localhost/api/cron/notificaciones", {
      headers: { authorization: "Bearer secreto-de-prueba" },
    })));
  expect(r.status).toBe(200);
  return send.mock.calls.map(([e]) => e as Envio).filter(e => e.to === BUZON);
}

async function editar(body: object) {
  const r = await sinAislamiento("panel interno de Evoluteca", () =>
    editarTenant(
      new Request(`http://localhost/api/admin-evoluteca/tenants/${A.tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": "clave-admin" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: A.tenantId }) },
    ));
  expect(r.status).toBe(200);
  return r.json();
}

describe("aviso de vencimiento de licencia", () => {
  it("guarda las fechas como días de Bogotá y avisa a Evoluteca una sola vez", async () => {
    const t = await editar({ licenciaVenceEn: "2027-08-30", licenciaAvisoEn: "2020-08-01" });
    expect(t.licenciaVenceEn).toBe("2027-08-30T05:00:00.000Z");
    expect(t.licenciaAvisadaEn).toBeNull();

    const primeros = await correrCron();
    const delTenant = primeros.filter(e => e.subject.includes("30 de agosto de 2027"));
    expect(delTenant).toHaveLength(1);
    expect(delTenant[0].subject).toContain("¿renovamos?");

    const fila = await sinAislamiento("lectura directa", () =>
      prisma.tenant.findUnique({ where: { id: A.tenantId }, select: { licenciaAvisadaEn: true, activo: true } }));
    expect(fila?.licenciaAvisadaEn).not.toBeNull();
    expect(fila?.activo).toBe(true); // avisar no suspende

    const segundos = await correrCron();
    expect(segundos.filter(e => e.subject.includes("30 de agosto de 2027"))).toHaveLength(0);
  });

  it("no avisa antes del día y cambiar la fecha re-arma el aviso", async () => {
    const futuro = await editar({ licenciaVenceEn: "2027-08-30", licenciaAvisoEn: "2099-01-01" });
    expect(futuro.licenciaAvisadaEn).toBeNull();
    expect((await correrCron()).filter(e => e.subject.includes("30 de agosto de 2027"))).toHaveLength(0);

    await editar({ licenciaAvisoEn: "2020-08-01" });
    expect((await correrCron()).filter(e => e.subject.includes("30 de agosto de 2027"))).toHaveLength(1);

    await editar({ licenciaVenceEn: null, licenciaAvisoEn: null });
  });
});
