/**
 * Una sesión abierta se corta cuando el usuario se desactiva o se borra, o
 * cuando su empresa se suspende o se borra (antes seguía entrando hasta que
 * venciera el token, hasta 12 horas). Un cambio de rol aplica sin volver a
 * iniciar sesión.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "./sembrar";
import { prisma, sinAislamiento } from "./prisma-vigilado";
import { estadoSesion, olvidarSesion } from "@/lib/sesion-vigente";

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  olvidarSesion(A.admin, A.tenantId);
});

afterEach(async () => {
  // Deja a A como estaba para las demás pruebas.
  await sinAislamiento("restaurar usuario y empresa A", async () => {
    await prisma.usuario.update({ where: { id: A.admin }, data: { activo: true, rol: "ADMINISTRADOR" } });
    await prisma.tenant.update({ where: { id: A.tenantId }, data: { activo: true } });
  });
  olvidarSesion(A.admin, A.tenantId);
});

describe("estadoSesion", () => {
  it("un usuario activo de una empresa activa sigue con sesión, con su rol actual", async () => {
    expect(await estadoSesion(A.admin, A.tenantId)).toMatchObject({ vigente: true, rol: "ADMINISTRADOR" });
  });

  it("si el usuario se desactiva, la sesión se corta", async () => {
    await sinAislamiento("desactivar usuario", () => prisma.usuario.update({ where: { id: A.admin }, data: { activo: false } }));
    expect(await estadoSesion(A.admin, A.tenantId)).toEqual({ vigente: false });
  });

  it("si la empresa se suspende, la sesión se corta", async () => {
    await sinAislamiento("suspender empresa", () => prisma.tenant.update({ where: { id: A.tenantId }, data: { activo: false } }));
    expect(await estadoSesion(A.admin, A.tenantId)).toEqual({ vigente: false });
  });

  it("un usuario que ya no existe, o con el token de otra empresa, no tiene sesión", async () => {
    expect(await estadoSesion("usuario-borrado", A.tenantId)).toEqual({ vigente: false });
    expect(await estadoSesion(A.admin, B.tenantId)).toEqual({ vigente: false });
  });

  it("un cambio de rol se ve sin volver a iniciar sesión", async () => {
    await sinAislamiento("cambiar rol", () => prisma.usuario.update({ where: { id: A.admin }, data: { rol: "COMERCIAL" } }));
    expect(await estadoSesion(A.admin, A.tenantId)).toMatchObject({ vigente: true, rol: "COMERCIAL" });
  });

  it("guarda el resultado 60 segundos y luego vuelve a mirar la base", async () => {
    const t0 = Date.now();
    expect((await estadoSesion(A.admin, A.tenantId, t0)).vigente).toBe(true);
    await sinAislamiento("suspender empresa", () => prisma.tenant.update({ where: { id: A.tenantId }, data: { activo: false } }));
    expect((await estadoSesion(A.admin, A.tenantId, t0 + 30_000)).vigente).toBe(true); // todavía en caché
    expect((await estadoSesion(A.admin, A.tenantId, t0 + 61_000)).vigente).toBe(false);
  });
});
