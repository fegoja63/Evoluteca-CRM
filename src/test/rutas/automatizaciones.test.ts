/**
 * Automatizaciones: aislamiento y reglas de rol de la API de gestión, más una
 * prueba de comportamiento del motor (una regla "oportunidad creada" crea la
 * tarea configurada).
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";
import { dispararAutomatizaciones } from "@/lib/automatizaciones-motor";

import { GET as listar, POST as crear } from "@/app/api/automatizaciones/route";
import { PATCH as editar, DELETE as eliminar } from "@/app/api/automatizaciones/[id]/route";

const REGLA_VALIDA = {
  nombre: "Seguimiento tras cotización",
  evento: "OPORTUNIDAD_CAMBIA_ETAPA",
  etapaDestino: "PROPUESTA",
  accion: "CREAR_TAREA",
  config: { titulo: "Llamar a {cliente}", tipo: "LLAMADA", diasPlazo: 3, responsable: "DUENO" },
};

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
});

describe("sin sesión", () => {
  beforeEach(() => sinSesion());

  it("listar responde 401", async () => {
    expect((await llamar(listar)).status).toBe(401);
  });

  it("crear responde 401", async () => {
    expect((await llamar(crear, { body: REGLA_VALIDA })).status).toBe(401);
  });
});

describe("reglas de rol", () => {
  it("un COMERCIAL no puede crear ni listar", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(listar)).status).toBe(403);
    expect((await llamar(crear, { body: REGLA_VALIDA })).status).toBe(403);
  });

  it("un ADMINISTRADOR crea una regla y aparece en el listado", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const creado = await llamar(crear, { body: REGLA_VALIDA });
    expect(creado.status).toBe(201);
    const regla = creado.cuerpo as { id: string; tenantId: string; etapaDestino: string };
    expect(regla.tenantId).toBe(A.tenantId);
    expect(regla.etapaDestino).toBe("PROPUESTA");

    const { cuerpo } = await llamar(listar);
    const ids = (cuerpo as Array<{ id: string }>).map(r => r.id);
    expect(ids).toContain(regla.id);
  });

  it("rechaza una config de acción inválida (crear tarea sin título)", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status } = await llamar(crear, {
      body: { ...REGLA_VALIDA, config: { titulo: "", tipo: "LLAMADA", diasPlazo: 3, responsable: "DUENO" } },
    });
    expect(status).toBe(400);
  });
});

describe("aislamiento entre clientes", () => {
  it("el cliente B no ve ni puede tocar una regla del cliente A", async () => {
    // A ya tiene una regla sembrada (A.automatizacion).
    comoUsuario(B, "ADMINISTRADOR");
    const { cuerpo } = await llamar(listar);
    const ids = (cuerpo as Array<{ id: string; tenantId: string }>).map(r => r.id);
    expect(ids).not.toContain(A.automatizacion);
    for (const r of cuerpo as Array<{ tenantId: string }>) expect(r.tenantId).toBe(B.tenantId);

    const patch = await llamar(editar, { params: { id: A.automatizacion }, body: { activa: false }, metodo: "PATCH" });
    expect(patch.status).toBe(404);

    const del = await llamar(eliminar, { params: { id: A.automatizacion }, metodo: "DELETE" });
    expect(del.status).toBe(404);
  });
});

describe("motor: ejecuta la acción configurada", () => {
  it("una regla 'oportunidad creada' crea la tarea para el dueño", async () => {
    // La regla sembrada de A: OPORTUNIDAD_CREADA → CREAR_TAREA "Contactar" (1 día, DUENO).
    await dispararAutomatizaciones({
      evento: "OPORTUNIDAD_CREADA",
      tenantId: A.tenantId,
      oportunidad: {
        id: A.oportunidadDelComercial,
        titulo: "Negocio nuevo",
        empresaId: A.empresa,
        contactoId: A.contacto,
        creadoBy: A.comercial,
      },
      actorId: A.comercial,
    });

    const tareas = await prisma.actividad.findMany({
      where: { tenantId: A.tenantId, oportunidadId: A.oportunidadDelComercial, titulo: "Contactar" },
    });
    expect(tareas.length).toBe(1);
    expect(tareas[0].tipo).toBe("LLAMADA");
    expect(tareas[0].responsableId).toBe(A.comercial);

    const regla = await prisma.automatizacion.findFirst({ where: { id: A.automatizacion, tenantId: A.tenantId } });
    expect(regla?.vecesEjecutada).toBeGreaterThanOrEqual(1);
  });

  it("no dispara reglas de otro tenant", async () => {
    // Evento del tenant A, pero se piden reglas de A: la regla de B (misma forma)
    // no debe ejecutarse ni crear tareas en A.
    await dispararAutomatizaciones({
      evento: "OPORTUNIDAD_CREADA",
      tenantId: A.tenantId,
      oportunidad: {
        id: A.oportunidadDelComercial,
        titulo: "Otro",
        empresaId: A.empresa,
        contactoId: A.contacto,
        creadoBy: A.comercial,
      },
      actorId: A.comercial,
    });

    const reglaB = await prisma.automatizacion.findFirst({ where: { id: B.automatizacion, tenantId: B.tenantId } });
    expect(reglaB?.vecesEjecutada).toBe(0);
  });
});
