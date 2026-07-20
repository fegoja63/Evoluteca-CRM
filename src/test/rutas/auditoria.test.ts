/**
 * Registro de auditoría: que deje constancia, que no filtre y que no se pueda
 * maquillar.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, B, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";
import { limpiar } from "@/lib/auditoria";

import { GET as consultarAuditoria } from "@/app/api/auditoria/route";
import { DELETE as eliminarOportunidad } from "@/app/api/oportunidades/[id]/route";
import { PATCH as editarUsuario } from "@/app/api/usuarios/[id]/route";

beforeEach(async () => {
  await sembrar();
});

describe("deja constancia de quien hizo que", () => {
  it("al enviar una oportunidad a la papelera", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    const { status } = await llamar(eliminarOportunidad, {
      metodo: "DELETE",
      params: { id: A.oportunidadDelComercial },
    });
    expect(status).toBe(200);

    const registro = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, entidadId: A.oportunidadDelComercial },
    });

    expect(registro).not.toBeNull();
    expect(registro?.accion).toBe("ELIMINAR");
    expect(registro?.entidad).toBe("Oportunidad");
    expect(registro?.usuarioId).toBe(A.admin);
    // El "antes" tiene que servir para saber que se perdio, no solo que hubo
    // un borrado.
    expect((registro?.antes as Record<string, unknown>)?.titulo).toContain("Cliente A");
  });

  it("al cambiarle el rol a alguien, con su propia accion", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    const { status } = await llamar(editarUsuario, {
      metodo: "PATCH",
      params: { id: A.comercial },
      body: { rol: "GERENTE" },
    });
    expect(status).toBe(200);

    const registro = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, entidadId: A.comercial },
    });

    // No un "ACTUALIZAR" generico: el cambio de permisos es LA pregunta de una
    // auditoria y tiene que poder filtrarse por si sola.
    expect(registro?.accion).toBe("CAMBIAR_ROL");
    expect(registro?.descripcion).toContain("COMERCIAL");
    expect(registro?.descripcion).toContain("GERENTE");
    expect((registro?.antes as Record<string, unknown>)?.rol).toBe("COMERCIAL");
  });

  it("si el cambio falla, no queda registro (van en la misma transaccion)", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    // Rol invalido: la ruta corta antes de escribir nada.
    const { status } = await llamar(editarUsuario, {
      metodo: "PATCH",
      params: { id: A.comercial },
      body: { rol: "EMPERADOR" },
    });
    expect(status).toBe(400);

    const registros = await prisma.registroAuditoria.count({
      where: { tenantId: A.tenantId, entidadId: A.comercial },
    });
    expect(registros).toBe(0);
  });
});

describe("la consulta del registro", () => {
  beforeEach(async () => {
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(eliminarOportunidad, {
      metodo: "DELETE",
      params: { id: A.oportunidadDelComercial },
    });
  });

  it("un COMERCIAL no puede consultarla", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(consultarAuditoria);
    expect(status).toBe(403);
  });

  it("un GERENTE tampoco: esto es control, no reporteria", async () => {
    comoUsuario(A, "GERENTE");
    const { status } = await llamar(consultarAuditoria);
    expect(status).toBe(403);
  });

  it("el administrador si, y ve lo suyo", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(consultarAuditoria);

    expect(status).toBe(200);
    expect((cuerpo as unknown[]).length).toBeGreaterThan(0);
  });

  it("el administrador del cliente B no ve NADA del cliente A", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(consultarAuditoria);

    expect(status).toBe(200);
    for (const r of cuerpo as Array<{ tenantId: string }>) {
      expect(r.tenantId).toBe(B.tenantId);
    }
  });
});

describe("no guarda secretos", () => {
  // Un registro de auditoria es un sitio donde queda todo escrito para siempre
  // y al que mira mas gente que a la tabla original. Meter ahi una contrasena
  // convierte la trazabilidad en una fuga.
  it("oculta contrasenas, tokens y llaves de API", () => {
    const limpio = limpiar({
      nombre: "Ana",
      passwordHash: "$2a$12$secreto",
      resetToken: "abc123",
      apiKeyLeads: "llave-secreta",
      tokenCalendario: "tok",
      anidado: { passwordHash: "otro-secreto", ok: "visible" },
    }) as Record<string, unknown>;

    expect(limpio.nombre).toBe("Ana");
    expect(limpio.passwordHash).toBe("[oculto]");
    expect(limpio.resetToken).toBe("[oculto]");
    expect(limpio.apiKeyLeads).toBe("[oculto]");
    expect(limpio.tokenCalendario).toBe("[oculto]");
    // Tambien en profundidad: los objetos anidados son el descuido tipico.
    expect((limpio.anidado as Record<string, unknown>).passwordHash).toBe("[oculto]");
    expect((limpio.anidado as Record<string, unknown>).ok).toBe("visible");
  });

  it("al cambiar una contrasena no la escribe en el registro", async () => {
    comoUsuario(A, "ADMINISTRADOR");

    await llamar(editarUsuario, {
      metodo: "PATCH",
      params: { id: A.comercial },
      body: { nuevaPassword: "unaClaveNueva123" },
    });

    const registro = await prisma.registroAuditoria.findFirst({
      where: { tenantId: A.tenantId, entidadId: A.comercial },
    });

    const texto = JSON.stringify(registro);
    expect(texto).not.toContain("unaClaveNueva123");
    expect(texto).not.toContain("$2a$");
    expect(texto).not.toContain("$2b$");
  });
});
