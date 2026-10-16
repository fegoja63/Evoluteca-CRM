/**
 * Recordatorio diario por correo (cron de notificaciones): es personal
 * ("Hola X, tienes N vencidas"), así que cada usuario recibe SOLO lo suyo,
 * sea cual sea su rol. Antes un gerente o administrador recibía las tareas y
 * los negocios de todo su equipo como si fueran propios (OLT, 2026-10-15).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";

// Resend se simula: no se envía nada y se puede ver qué le llegaría a quién.
type Envio = { to: string; subject: string; html: string };
const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => {
  class Resend { emails = { send }; }
  return { Resend };
});

import { GET as cron } from "@/app/api/cron/notificaciones/route";
import { POST as enviarNotificacion } from "@/app/api/notificaciones/enviar/route";
import { comoUsuario, llamar } from "../helpers";

const TAREA_DEL_GERENTE = "Tarea que el admin le asignó al gerente";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
  vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
  send.mockReset();
  send.mockResolvedValue({ error: null });

  // Vencida, creada por el admin pero asignada al gerente: es del gerente.
  await prisma.actividad.create({
    data: {
      tenantId: A.tenantId, titulo: TAREA_DEL_GERENTE, tipo: "TAREA",
      fecha: new Date("2026-03-16T15:00:00.000Z"), creadoBy: A.admin, responsableId: A.gerente,
    },
  });
  // El negocio del admin lleva meses quieto: debe avisarle solo al admin.
  await prisma.oportunidad.update({
    where: { id: A.oportunidadAjena },
    data: { creadoEn: new Date("2026-01-01T00:00:00.000Z") },
  });
});

async function correrCron(): Promise<Envio[]> {
  // El cron recorre a propósito los usuarios de todos los tenants; lo que se
  // vigila aquí es que cada correo lleve solo lo de su destinatario.
  const respuesta = await sinAislamiento("el cron recorre todos los tenants", () =>
    cron(new Request("http://localhost/api/cron/notificaciones", {
      headers: { authorization: "Bearer secreto-de-prueba" },
    })));
  expect(respuesta.status).toBe(200);
  return send.mock.calls.map(([e]) => e as Envio);
}

// Correos personales de un usuario de A (sin el aparte "del equipo").
const deA = (envios: Envio[], usuario: "admin" | "gerente" | "comercial") =>
  envios.filter(e => e.to === `${usuario}@${A.tenantId}.test` && !e.subject.includes("del equipo")).map(e => e.html).join("\n");
// El correo aparte de vencidas del equipo, si le llegó.
const delEquipoA = (envios: Envio[], usuario: "admin" | "gerente" | "comercial") =>
  envios.filter(e => e.to === `${usuario}@${A.tenantId}.test` && e.subject.includes("del equipo"));

describe("Recordatorio diario: cada quien recibe solo lo suyo", () => {
  it("el gerente recibe sus tareas, no las del comercial ni el negocio del admin", async () => {
    const html = deA(await correrCron(), "gerente");
    expect(html).toContain(TAREA_DEL_GERENTE);
    expect(html).not.toContain("Actividad de ");
    expect(html).not.toContain("Oportunidad del admin");
  });

  it("en sus correos personales el administrador recibe su negocio quieto, no las tareas de otros", async () => {
    const html = deA(await correrCron(), "admin");
    expect(html).toContain("Oportunidad del admin");
    expect(html).not.toContain("Actividad de ");
    expect(html).not.toContain(TAREA_DEL_GERENTE);
  });

  it("el administrador recibe aparte las vencidas del equipo, con su responsable", async () => {
    const equipo = delEquipoA(await correrCron(), "admin");
    expect(equipo).toHaveLength(1);
    expect(equipo[0].subject).toContain("2 actividad(es) vencida(s) del equipo");
    expect(equipo[0].html).toContain("Actividad de ");
    expect(equipo[0].html).toContain(TAREA_DEL_GERENTE);
    expect(equipo[0].html).toContain("Gerente ");
  });

  it("el gerente y el comercial no reciben el correo del equipo", async () => {
    const envios = await correrCron();
    expect(delEquipoA(envios, "gerente")).toHaveLength(0);
    expect(delEquipoA(envios, "comercial")).toHaveLength(0);
  });

  it("el comercial sigue recibiendo sus tareas, y nada de los demás", async () => {
    const html = deA(await correrCron(), "comercial");
    expect(html).toContain("Actividad de ");
    expect(html).not.toContain(TAREA_DEL_GERENTE);
    expect(html).not.toContain("Oportunidad del admin");
  });
});

describe("Resumen diario manual (/api/notificaciones/enviar)", () => {
  it("al gerente solo le lista sus propias tareas", async () => {
    comoUsuario(A, "GERENTE");
    const { respuesta } = await llamar(enviarNotificacion, { body: { tipo: "RESUMEN_DIARIO", datos: {} } });
    expect(respuesta.status).toBe(200);
    const { html } = send.mock.calls[0][0] as Envio;
    expect(html).toContain(TAREA_DEL_GERENTE);
    expect(html).not.toContain("Actividad de ");
  });
});
