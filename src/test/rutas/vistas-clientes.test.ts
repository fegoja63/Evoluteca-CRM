/**
 * Vistas guardadas de Clientes (?vista=mios | sinVendedor) y sus conteos.
 *
 * Lo importante es el rol: un COMERCIAL solo ve sus clientes, y la vista
 * "sin vendedor" no puede abrirle la puerta a los que no tienen dueño.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as listar } from "@/app/api/empresas/route";
import { GET as stats } from "@/app/api/empresas/stats/route";

const SIN_DUENO = "emp-a-sin-dueno";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.empresa.create({
    data: { id: SIN_DUENO, tenantId: A.tenantId, nombre: "Cliente sin vendedor", creadoBy: null },
  });
});

const ids = (cuerpo: unknown) => (cuerpo as { id: string }[]).map(e => e.id);

describe("ADMINISTRADOR", () => {
  beforeEach(() => comoUsuario(A, "ADMINISTRADOR"));

  it("'sin vendedor' trae solo los clientes sin dueño", async () => {
    const { status, cuerpo } = await llamar(listar, { query: { vista: "sinVendedor" } });
    expect(status).toBe(200);
    expect(ids(cuerpo)).toEqual([SIN_DUENO]);
  });

  it("'mis clientes' trae los suyos y no el sin dueño", async () => {
    const { cuerpo } = await llamar(listar, { query: { vista: "mios" } });
    expect(ids(cuerpo)).toContain(A.empresa);
    expect(ids(cuerpo)).not.toContain(SIN_DUENO);
  });

  it("los conteos de las pestañas cuadran", async () => {
    const { cuerpo } = await llamar(stats);
    expect(cuerpo).toMatchObject({ sinVendedor: 1 });
    expect((cuerpo as { mios: number }).mios).toBeGreaterThanOrEqual(1);
  });
});

describe("COMERCIAL", () => {
  beforeEach(() => comoUsuario(A, "COMERCIAL"));

  it("'sin vendedor' no le muestra clientes sin dueño", async () => {
    const { status, cuerpo } = await llamar(listar, { query: { vista: "sinVendedor" } });
    expect(status).toBe(200);
    expect(ids(cuerpo)).toEqual([]);
  });

  it("el conteo 'sin vendedor' es 0 para él", async () => {
    const { cuerpo } = await llamar(stats);
    expect(cuerpo).toMatchObject({ sinVendedor: 0 });
  });
});
