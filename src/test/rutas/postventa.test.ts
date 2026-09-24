/**
 * Postventa (módulo opcional): entrada automática al ganar, tablero, etapa y
 * fecha de renovación, y la oportunidad de renovación. Con el aislamiento entre
 * clientes probado CON el módulo activo en ambos (con el módulo apagado, la
 * ruta respondería 403 a todos y el aislamiento no se estaría probando).
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { GET as tablero } from "@/app/api/postventa/route";
import { PATCH as editar } from "@/app/api/oportunidades/[id]/route";
import { POST as renovar } from "@/app/api/oportunidades/[id]/renovacion/route";
import { PATCH as editarCotizacion } from "@/app/api/cotizaciones/[id]/route";

async function activarPostventa(tenantId: string) {
  await prisma.tenant.update({ where: { id: tenantId }, data: { modulos: { postventa: true } } });
}

async function ganar(id: string) {
  return llamar(editar, { metodo: "PATCH", params: { id }, body: { etapa: "GANADA" } });
}

async function leer(id: string, tenantId: string) {
  return prisma.oportunidad.findFirst({ where: { id, tenantId } });
}

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
});

describe("con el módulo apagado", () => {
  it("el tablero responde 403 y ganar un negocio no lo mete a postventa", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(tablero)).status).toBe(403);
    expect((await ganar(A.oportunidadDelComercial)).status).toBe(200);
    expect((await leer(A.oportunidadDelComercial, A.tenantId))?.postventaEtapa).toBeNull();
  });

  it("crear la renovación responde 403", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);
    const { status } = await llamar(renovar, { metodo: "POST", params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(403);
  });
});

describe("con el módulo activo", () => {
  beforeEach(async () => {
    await activarPostventa(A.tenantId);
    await activarPostventa(B.tenantId);
  });

  it("al ganar desde el pipeline, el negocio entra a postventa en Entrega y aparece en el tablero", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);
    expect((await leer(A.oportunidadDelComercial, A.tenantId))?.postventaEtapa).toBe("ENTREGA");

    const { status, cuerpo } = await llamar(tablero);
    expect(status).toBe(200);
    const ids = (cuerpo as { id: string }[]).map(n => n.id);
    expect(ids).toEqual([A.oportunidadDelComercial]);
  });

  it("al aceptar la cotización, su negocio también entra a postventa", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(editarCotizacion, { metodo: "PATCH", params: { id: A.cotizacion }, body: { estado: "ACEPTADA" } });
    expect(status).toBe(200);
    const op = await leer(A.oportunidadDelComercial, A.tenantId);
    expect(op?.etapa).toBe("GANADA");
    expect(op?.postventaEtapa).toBe("ENTREGA");
  });

  it("un COMERCIAL solo ve en el tablero sus propios negocios", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);
    await ganar(A.oportunidadAjena);

    comoUsuario(A, "COMERCIAL");
    const { cuerpo } = await llamar(tablero);
    expect((cuerpo as { id: string }[]).map(n => n.id)).toEqual([A.oportunidadDelComercial]);
  });

  it("guarda etapa y fecha de renovación; un negocio no ganado no puede pasar a postventa", async () => {
    comoUsuario(A, "GERENTE");
    const noGanado = await llamar(editar, { metodo: "PATCH", params: { id: A.oportunidadAjena }, body: { postventaEtapa: "ENTREGA" } });
    expect(noGanado.status).toBe(400);

    await ganar(A.oportunidadDelComercial);
    const { status } = await llamar(editar, {
      metodo: "PATCH", params: { id: A.oportunidadDelComercial },
      body: { postventaEtapa: "SEGUIMIENTO", fechaRenovacion: "2026-12-01" },
    });
    expect(status).toBe(200);
    const op = await leer(A.oportunidadDelComercial, A.tenantId);
    expect(op?.postventaEtapa).toBe("SEGUIMIENTO");
    expect(op?.fechaRenovacion).not.toBeNull();
  });

  it("crea la oportunidad de renovación ligada al original, con su tarea, y no la duplica", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);
    await llamar(editar, { metodo: "PATCH", params: { id: A.oportunidadDelComercial }, body: { fechaRenovacion: "2026-12-01" } });

    const { status, cuerpo } = await llamar(renovar, { metodo: "POST", params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(201);
    const nueva = cuerpo as { id: string };
    const renovacion = await leer(nueva.id, A.tenantId);
    expect(renovacion).toMatchObject({
      origenRenovacionId: A.oportunidadDelComercial, etapa: "CALIFICADO", recurrente: true,
      creadoBy: A.comercial, // del vendedor dueño del negocio original
    });
    expect(renovacion?.fechaCierre).not.toBeNull();
    // La tarea de renovación (las automatizaciones de "oportunidad creada" del
    // tenant pueden sumar las suyas: eso es correcto y no se cuenta aquí).
    const tareas = await prisma.actividad.count({
      where: { tenantId: A.tenantId, oportunidadId: nueva.id, completada: false, titulo: { startsWith: "Preparar propuesta de renovación" } },
    });
    expect(tareas).toBe(1);
    expect((await leer(A.oportunidadDelComercial, A.tenantId))?.postventaEtapa).toBe("RENOVACION");

    const otraVez = await llamar(renovar, { metodo: "POST", params: { id: A.oportunidadDelComercial } });
    expect(otraVez.status).toBe(409);
    expect((otraVez.cuerpo as { id: string }).id).toBe(nueva.id);
  });

  it("no se puede renovar un negocio que no está ganado", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(renovar, { metodo: "POST", params: { id: A.oportunidadAjena } });
    expect(status).toBe(400);
  });

  it("el cliente B no puede renovar un negocio del cliente A (y no cambia nada)", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);

    comoUsuario(B, "ADMINISTRADOR");
    const { status } = await llamar(renovar, { metodo: "POST", params: { id: A.oportunidadDelComercial } });
    expect(status).toBe(404);
    const renovacionesA = await prisma.oportunidad.count({ where: { tenantId: A.tenantId, origenRenovacionId: { not: null } } });
    const renovacionesB = await prisma.oportunidad.count({ where: { tenantId: B.tenantId, origenRenovacionId: { not: null } } });
    expect(renovacionesA + renovacionesB).toBe(0);
  });

  it("el tablero del cliente B no muestra negocios del cliente A", async () => {
    comoUsuario(A, "GERENTE");
    await ganar(A.oportunidadDelComercial);
    comoUsuario(B, "ADMINISTRADOR");
    const { cuerpo } = await llamar(tablero);
    expect(cuerpo).toEqual([]);
  });
});
