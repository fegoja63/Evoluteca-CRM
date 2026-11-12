/** "El cliente abrió la cotización": qué aperturas del enlace público cuentan. */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { GET as verPublica, POST as registrarVista } from "@/app/api/publica/cotizacion/[token]/route";

const TOKEN = "token-vista-pruebas";

beforeAll(async () => {
  // Sin clave de Resend: el aviso por correo de la primera vista no sale de las pruebas.
  vi.stubEnv("RESEND_API_KEY", "");
  await sembrar();
});
afterAll(() => {
  vi.unstubAllEnvs();
});
beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.cotizacion.update({ where: { id: A.cotizacion, tenantId: A.tenantId }, data: { tokenPublico: TOKEN, estado: "ENVIADA" } });
});

// El enlace público busca la cotización por su token (no hay sesión que dé el tenant).
const porToken = <T,>(fn: () => Promise<T>) => sinAislamiento("el enlace público busca la cotización por su token", fn);

async function vistas() {
  return prisma.cotizacion.findFirst({
    where: { id: A.cotizacion, tenantId: A.tenantId },
    select: { vistas: true, vistaPrimeraEn: true, vistaUltimaEn: true },
  });
}

describe("vistas del enlace público", () => {
  it("el cliente (sin sesión) cuenta como vista y queda la fecha de la primera", async () => {
    sinSesion();
    const { status } = await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    expect(status).toBe(200);
    const v = await vistas();
    expect(v?.vistas).toBe(1);
    expect(v?.vistaPrimeraEn).not.toBeNull();
  });

  it("una recarga dentro de la misma visita no suma", async () => {
    sinSesion();
    await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    expect((await vistas())?.vistas).toBe(1);
  });

  it("vuelve a contar si pasó más de media hora desde la última", async () => {
    sinSesion();
    await prisma.cotizacion.update({
      where: { id: A.cotizacion, tenantId: A.tenantId },
      data: { vistas: 1, vistaPrimeraEn: new Date(Date.now() - 2 * 3600_000), vistaUltimaEn: new Date(Date.now() - 2 * 3600_000) },
    });
    await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    expect((await vistas())?.vistas).toBe(2);
  });

  it("no cuenta cuando la abre alguien del mismo equipo", async () => {
    comoUsuario(A, "COMERCIAL");
    await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    const v = await vistas();
    expect(v?.vistas).toBe(0);
    expect(v?.vistaPrimeraEn).toBeNull();
  });

  it("sí cuenta si quien la abre tiene sesión en otra cuenta", async () => {
    comoUsuario(B, "ADMINISTRADOR");
    await porToken(() => llamar(registrarVista, { params: { token: TOKEN }, metodo: "POST" }));
    expect((await vistas())?.vistas).toBe(1);
  });

  it("token inexistente responde 404", async () => {
    sinSesion();
    const { status } = await porToken(() => llamar(registrarVista, { params: { token: "no-existe" }, metodo: "POST" }));
    expect(status).toBe(404);
  });

  it("la página pública no le muestra al cliente sus aperturas", async () => {
    sinSesion();
    const { status, cuerpo } = await porToken(() => llamar(verPublica, { params: { token: TOKEN } }));
    expect(status).toBe(200);
    expect(cuerpo).not.toHaveProperty("vistas");
    expect(cuerpo).not.toHaveProperty("vistaUltimaEn");
  });
});
