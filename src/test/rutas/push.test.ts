/** Avisos push: suscripciones por usuario y envío (con el servicio de push simulado). */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";

const envios = vi.hoisted(() => ({ lista: [] as { endpoint: string; carga: string }[], vencidos: new Set<string>() }));
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: () => {},
    sendNotification: async (sub: { endpoint: string }, carga: string) => {
      if (envios.vencidos.has(sub.endpoint)) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      envios.lista.push({ endpoint: sub.endpoint, carga });
      return { statusCode: 201 };
    },
  },
}));

import { GET as estadoPush, POST as suscribir, DELETE as quitar } from "@/app/api/push/route";
import { POST as prueba } from "@/app/api/push/prueba/route";
import { enviarPush } from "@/lib/push";

const SUB = (n: string) => ({
  endpoint: `https://push.example.com/${n}`,
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" },
});

beforeAll(async () => {
  vi.stubEnv("VAPID_PUBLIC_KEY", "BPrueba-llave-publica");
  vi.stubEnv("VAPID_PRIVATE_KEY", "prueba-llave-privada");
  await sembrar();
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(async () => {
  await sembrarSiHizoFalta();
  envios.lista = [];
  envios.vencidos.clear();
});

describe("suscripción a avisos", () => {
  it("dice si los avisos están disponibles y en cuántos dispositivos", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status, cuerpo } = await llamar(estadoPush);
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ disponible: true, publicKey: "BPrueba-llave-publica", dispositivos: 0 });
  });

  it("guarda la suscripción del navegador y no la duplica", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(suscribir, { body: SUB("uno") })).status).toBe(201);
    expect((await llamar(suscribir, { body: SUB("uno") })).status).toBe(201);
    const { cuerpo } = await llamar(estadoPush);
    expect((cuerpo as { dispositivos: number }).dispositivos).toBe(1);
  });

  it("rechaza un endpoint que no es https", async () => {
    comoUsuario(A, "COMERCIAL");
    const { status } = await llamar(suscribir, { body: { ...SUB("x"), endpoint: "http://inseguro.example.com/x" } });
    expect(status).toBe(400);
  });

  it("quitar solo borra la suscripción propia", async () => {
    comoUsuario(A, "COMERCIAL");
    await llamar(suscribir, { body: SUB("propia") });
    comoUsuario(B, "ADMINISTRADOR");
    await llamar(quitar, { metodo: "DELETE", body: { endpoint: SUB("propia").endpoint } });
    const sigue = await prisma.suscripcionPush.count({ where: { tenantId: A.tenantId, endpoint: SUB("propia").endpoint } });
    expect(sigue).toBe(1);
    comoUsuario(A, "COMERCIAL");
    await llamar(quitar, { metodo: "DELETE", body: { endpoint: SUB("propia").endpoint } });
    expect(await prisma.suscripcionPush.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });
});

describe("envío de avisos", () => {
  it("llega a los dispositivos del usuario, no a los de otros", async () => {
    comoUsuario(A, "COMERCIAL");
    await llamar(suscribir, { body: SUB("comercial-A") });
    comoUsuario(A, "ADMINISTRADOR");
    await llamar(suscribir, { body: SUB("admin-A") });

    const n = await enviarPush(A.tenantId, [A.comercial], { titulo: "Hola", cuerpo: "Prueba", url: "/dashboard/agenda" });
    expect(n).toBe(1);
    expect(envios.lista.map(e => e.endpoint)).toEqual([SUB("comercial-A").endpoint]);
    expect(JSON.parse(envios.lista[0].carga)).toMatchObject({ titulo: "Hola", url: "/dashboard/agenda" });
  });

  it("no envía a usuarios de otra cuenta aunque se pase su id", async () => {
    comoUsuario(B, "COMERCIAL");
    await llamar(suscribir, { body: SUB("comercial-B") });
    const n = await enviarPush(A.tenantId, [B.comercial], { titulo: "x", cuerpo: "y", url: "/dashboard" });
    expect(n).toBe(0);
  });

  it("borra la suscripción que el navegador anuló (410)", async () => {
    comoUsuario(A, "COMERCIAL");
    await llamar(suscribir, { body: SUB("vencida") });
    envios.vencidos.add(SUB("vencida").endpoint);
    await enviarPush(A.tenantId, [A.comercial], { titulo: "x", cuerpo: "y", url: "/dashboard" });
    expect(await prisma.suscripcionPush.count({ where: { tenantId: A.tenantId } })).toBe(0);
  });

  it("el aviso de prueba responde 409 si no hay dispositivos", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(prueba, { metodo: "POST" })).status).toBe(409);
  });
});
