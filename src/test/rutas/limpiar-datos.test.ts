/**
 * "Borrar todos los datos del CRM" (Configuración → Zona de peligro).
 *
 * Borra definitivamente, sin papelera. En producción se usó sin dejar rastro y
 * un tenant perdió 71 oportunidades sin que se supiera quién ni cuándo: por eso
 * exige el nombre exacto de la empresa y deja constancia en la auditoría.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

import { DELETE as limpiarDatos } from "@/app/api/configuracion/limpiar/route";

beforeEach(async () => {
  await sembrar();
});

describe("borrar todos los datos del CRM", () => {
  it("sin el nombre de la empresa no borra nada", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    const { status } = await llamar(limpiarDatos, { metodo: "DELETE" });
    expect(status).toBe(400);
    expect(await prisma.empresa.count({ where: { tenantId: A.tenantId } })).toBeGreaterThan(0);
  });

  it("con un nombre equivocado no borra nada", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    const { status } = await llamar(limpiarDatos, { metodo: "DELETE", body: { confirmacion: "Cliente B" } });
    expect(status).toBe(400);
    expect(await prisma.oportunidad.count({ where: { tenantId: A.tenantId } })).toBeGreaterThan(0);
  });

  it("solo un administrador puede hacerlo", async () => {
    comoUsuario(A, "GERENTE");

    const { status } = await llamar(limpiarDatos, { metodo: "DELETE", body: { confirmacion: "Cliente A" } });
    expect(status).toBe(403);
    expect(await prisma.empresa.count({ where: { tenantId: A.tenantId } })).toBeGreaterThan(0);
  });

  it("con el nombre correcto borra, deja constancia y no toca otro tenant", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const oportunidadesAntes = await prisma.oportunidad.count({ where: { tenantId: A.tenantId } });
    const empresasDeB = await prisma.empresa.count({ where: { tenantId: B.tenantId } });

    // Sin importar mayúsculas ni espacios sobrantes.
    const { status } = await llamar(limpiarDatos, { metodo: "DELETE", body: { confirmacion: "  cliente   a " } });
    expect(status).toBe(200);

    expect(await prisma.empresa.count({ where: { tenantId: A.tenantId } })).toBe(0);
    expect(await prisma.oportunidad.count({ where: { tenantId: A.tenantId } })).toBe(0);
    expect(await prisma.empresa.count({ where: { tenantId: B.tenantId } })).toBe(empresasDeB);

    const registro = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, accion: "ELIMINAR_DEFINITIVO", entidad: "Tenant" },
    });
    expect(registro).not.toBeNull();
    expect(registro?.usuarioId).toBe(A.admin);
    expect((registro?.antes as Record<string, unknown>)?.oportunidades).toBe(oportunidadesAntes);
  });
});
