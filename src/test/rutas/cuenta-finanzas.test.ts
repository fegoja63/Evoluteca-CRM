/**
 * Cuenta "solo Finanzas" (Gerente Financiero sin el CRM): solo el panel
 * interno la marca; el dashboard la lleva al módulo desde cualquier pantalla
 * del CRM y el menú se reduce; no recibe los correos automáticos del CRM.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { comoUsuario } from "../helpers";

// El layout lee la ruta de la cabecera que pone el middleware.
let rutaActual = "/dashboard";
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": rutaActual }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`redirect ${url}`); },
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} }),
  usePathname: () => rutaActual,
  useSearchParams: () => new URLSearchParams(),
}));
// La activación de cuenta (cambio de clave, contrato) no es lo que se prueba aquí.
vi.mock("@/lib/activacion", () => ({ estadoActivacion: async () => ({ necesitaActivar: false }) }));

import DashboardLayout from "@/app/dashboard/layout";
import { Sidebar } from "@/components/sidebar";
import { PATCH as editarTenant } from "@/app/api/admin-evoluteca/tenants/[id]/route";
import { GET as resumenSemanal } from "@/app/api/cron/resumen-semanal/route";

const CLAVE = "clave-admin";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("ADMIN_REGISTRO_SECRET", CLAVE);
  await prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "admin-evoluteca:" } } });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function marcarSoloFinanzas(tenantId: string, valor: boolean) {
  await sinAislamiento("preparar una cuenta solo Finanzas", () =>
    prisma.tenant.update({ where: { id: tenantId }, data: { soloFinanzas: valor } }));
}

// Recorre el árbol que devuelve el layout y trae los props del Sidebar.
function propsDelSidebar(nodo: ReactNode): Record<string, unknown> | null {
  if (Array.isArray(nodo)) {
    for (const n of nodo) { const p = propsDelSidebar(n); if (p) return p; }
    return null;
  }
  if (!isValidElement(nodo)) return null;
  const el = nodo as ReactElement<{ children?: ReactNode }>;
  if (el.type === Sidebar) return el.props as Record<string, unknown>;
  return propsDelSidebar(el.props.children);
}

async function abrir(ruta: string) {
  rutaActual = ruta;
  try {
    const arbol = await DashboardLayout({ children: null });
    return { redirige: null as string | null, sidebar: propsDelSidebar(arbol) };
  } catch (e) {
    const m = /^redirect (.+)$/.exec((e as Error).message);
    if (!m) throw e;
    return { redirige: m[1], sidebar: null };
  }
}

describe("solo el panel interno marca una cuenta solo Finanzas", () => {
  it("sin la clave del panel no se puede", async () => {
    const r = await sinAislamiento("panel interno de Evoluteca", () =>
      editarTenant(new Request(`http://localhost/api/admin-evoluteca/tenants/${A.tenantId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": "otra" },
        body: JSON.stringify({ soloFinanzas: true }),
      }), { params: Promise.resolve({ id: A.tenantId }) }));
    expect(r.status).toBe(403);
  });

  it("con la clave queda marcada", async () => {
    const r = await sinAislamiento("panel interno de Evoluteca", () =>
      editarTenant(new Request(`http://localhost/api/admin-evoluteca/tenants/${A.tenantId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-secret": CLAVE },
        body: JSON.stringify({ soloFinanzas: true }),
      }), { params: Promise.resolve({ id: A.tenantId }) }));
    expect(r.status).toBe(200);
    expect((await r.json()).soloFinanzas).toBe(true);
  });
});

describe("el dashboard de una cuenta solo Finanzas", () => {
  it("lleva las pantallas del CRM al Gerente Financiero", async () => {
    await marcarSoloFinanzas(A.tenantId, true);
    comoUsuario(A, "ADMINISTRADOR");
    expect((await abrir("/dashboard")).redirige).toBe("/dashboard/finanzas");
    expect((await abrir("/dashboard/pipeline")).redirige).toBe("/dashboard/finanzas");
    expect((await abrir("/dashboard/cuentas/x")).redirige).toBe("/dashboard/finanzas");
  });

  it("deja el módulo y lo administrativo, con el menú reducido", async () => {
    await marcarSoloFinanzas(A.tenantId, true);
    comoUsuario(A, "ADMINISTRADOR");
    for (const ruta of ["/dashboard/finanzas", "/dashboard/equipo", "/dashboard/configuracion"]) {
      const { redirige, sidebar } = await abrir(ruta);
      expect(redirige).toBeNull();
      expect(sidebar?.soloFinanzas).toBe(true);
    }
  });

  it("una cuenta con CRM no cambia", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { redirige, sidebar } = await abrir("/dashboard/pipeline");
    expect(redirige).toBeNull();
    expect(sidebar?.soloFinanzas).toBe(false);
    // Sin licencia del Gerente Financiero no aparece en su menú.
    expect(sidebar?.conFinanzas).toBe(false);
  });
});

describe("correos automáticos del CRM", () => {
  it("el Resumen del Lunes no le llega a una cuenta solo Finanzas", async () => {
    vi.stubEnv("CRON_SECRET", "cron");
    const contar = async () => {
      const r = await sinAislamiento("el cron recorre todos los tenants", () =>
        resumenSemanal(new Request("http://localhost/api/cron/resumen-semanal?dryRun=1", {
          headers: { authorization: "Bearer cron" },
        })));
      return (await r.json()).usuarios as number;
    };
    const antes = await contar();
    await marcarSoloFinanzas(A.tenantId, true);
    const usuariosDeA = await sinAislamiento("contar usuarios del tenant A", () =>
      prisma.usuario.count({ where: { tenantId: A.tenantId, activo: true } }));
    expect(await contar()).toBe(antes - usuariosDeA);
  });
});
