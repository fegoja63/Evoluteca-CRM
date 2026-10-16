/**
 * Vistas para despachar el día: Bandeja Hoy e Inicio abren por defecto en lo
 * propio para el Gerente y en el equipo para el Administrador (controla toda
 * la actividad); ambos cambian con ?alcance=mias|equipo. Un Comercial siempre
 * ve lo suyo. El calendario suscrito trae solo lo propio para todos. Antes, en cuentas sin comerciales (Belarte, OLT), cada
 * gerente veía las tareas del otro como si fueran suyas.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario, llamar } from "../helpers";
import type { ItemBandeja } from "@/components/bandeja-hoy";

// El Inicio trae botones de cliente que usan el router de Next; aquí se
// renderiza a HTML fuera de Next, así que se simula un router vacío.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));

import BandejaHoyPage from "@/app/dashboard/hoy/page";
import InicioPage from "@/app/dashboard/page";
import { GET as calendario } from "@/app/api/calendario/[token]/route";
import { GET as resumenSemanal } from "@/app/api/cron/resumen-semanal/route";

const TAREA_DEL_GERENTE = "Tarea que el admin le asignó al gerente";
// La sembrada del comercial (act-a-1) se titula "Actividad de <tenant>".
const DEL_COMERCIAL = "Actividad de ";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.actividad.create({
    data: {
      tenantId: A.tenantId, titulo: TAREA_DEL_GERENTE, tipo: "TAREA",
      fecha: new Date("2026-03-16T15:00:00.000Z"), creadoBy: A.admin, responsableId: A.gerente,
    },
  });
});

const conAlcance = (alcance?: string) => ({ searchParams: Promise.resolve(alcance ? { alcance } : {}) });

async function bandeja(alcance?: string) {
  const el = (await BandejaHoyPage(conAlcance(alcance))) as ReactElement<{ itemsIniciales: ItemBandeja[]; alcance: string | null }>;
  return { titulos: el.props.itemsIniciales.map(i => i.titulo), alcance: el.props.alcance };
}

describe("Bandeja Hoy", () => {
  it("al gerente le muestra solo sus tareas por defecto", async () => {
    comoUsuario(A, "GERENTE");
    const { titulos, alcance } = await bandeja();
    expect(alcance).toBe("mias");
    expect(titulos).toContain(TAREA_DEL_GERENTE);
    expect(titulos.some(t => t.startsWith(DEL_COMERCIAL))).toBe(false);
  });

  it("con ?alcance=equipo el gerente ve las del equipo", async () => {
    comoUsuario(A, "GERENTE");
    const { titulos, alcance } = await bandeja("equipo");
    expect(alcance).toBe("equipo");
    expect(titulos).toContain(TAREA_DEL_GERENTE);
    expect(titulos.some(t => t.startsWith(DEL_COMERCIAL))).toBe(true);
  });

  it("al administrador le abre por defecto en el equipo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { titulos, alcance } = await bandeja();
    expect(alcance).toBe("equipo");
    expect(titulos).toContain(TAREA_DEL_GERENTE);
    expect(titulos.some(t => t.startsWith(DEL_COMERCIAL))).toBe(true);
  });

  it("en 'Mías' el administrador no recibe la tarea que asignó a otro", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { titulos, alcance } = await bandeja("mias");
    expect(alcance).toBe("mias");
    expect(titulos).not.toContain(TAREA_DEL_GERENTE);
    expect(titulos.some(t => t.startsWith(DEL_COMERCIAL))).toBe(false);
  });

  it("un comercial no puede pedir la vista del equipo ni ve el interruptor", async () => {
    comoUsuario(A, "COMERCIAL");
    const { titulos, alcance } = await bandeja("equipo");
    expect(alcance).toBeNull();
    expect(titulos.some(t => t.startsWith(DEL_COMERCIAL))).toBe(true);
    expect(titulos).not.toContain(TAREA_DEL_GERENTE);
  });
});

describe("Inicio", () => {
  async function inicio(alcance?: string) {
    return renderToStaticMarkup((await InicioPage(conAlcance(alcance))) as ReactElement);
  }

  it("el saludo y 'Lo primero de hoy' del gerente cuentan solo lo suyo", async () => {
    comoUsuario(A, "GERENTE");
    const html = await inicio();
    expect(html).toContain("Tienes 1 cosa para hoy");
    expect(html).toContain(TAREA_DEL_GERENTE);
    expect(html).not.toContain(DEL_COMERCIAL);
  });

  it("con ?alcance=equipo cuentan las del equipo y lo dicen", async () => {
    comoUsuario(A, "GERENTE");
    const html = await inicio("equipo");
    expect(html).toContain("El equipo tiene 2 cosas para hoy");
    expect(html).toContain(DEL_COMERCIAL);
  });
});

describe("Calendario suscrito", () => {
  it("solo trae las actividades propias, también a un gerente", async () => {
    await prisma.usuario.update({ where: { id: A.gerente }, data: { tokenCalendario: "token-cal-gerente" } });
    // La suscripción busca al usuario por su token (la credencial), sin tenantId.
    const { respuesta } = await sinAislamiento("el calendario busca al usuario por su token", () =>
      llamar(calendario, { params: { token: "token-cal-gerente.ics" } }));
    expect(respuesta.status).toBe(200);
    const ics = await respuesta.text();
    expect(ics).toContain(TAREA_DEL_GERENTE);
    expect(ics).not.toContain(DEL_COMERCIAL);
  });
});

describe("Resumen del lunes", () => {
  it("al administrador le dice que las cifras son del equipo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { respuesta } = await llamar(resumenSemanal, {});
    const html = await respuesta.text();
    expect(html).toContain("así arranca la semana de tu equipo");
    expect(html).not.toContain("así arranca tu semana");
  });
});
