/**
 * Cron de correos entrantes (/api/cron/correos-entrantes): una respuesta ya
 * registrada no se duplica ni se reenvía otra vez, y el lote respeta un
 * presupuesto de tiempo (lo que no alcanza queda sin leer para la próxima
 * corrida). El buzón (IMAP) y Resend se simulan; el correo se parsea de verdad.
 */
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { prisma, sinAislamiento } from "../prisma-vigilado";

const imap = vi.hoisted(() => ({
  uids: [] as number[],
  fuentes: new Map<number, string>(),
  leidos: [] as string[],
}));
vi.mock("imapflow", () => {
  class ImapFlow {
    async connect() {}
    async getMailboxLock() { return { release() {} }; }
    async search() { return imap.uids; }
    async fetchOne(uid: string) { return { source: Buffer.from(imap.fuentes.get(Number(uid)) ?? "") }; }
    async messageFlagsAdd(uid: string) { imap.leidos.push(uid); }
    async logout() {}
  }
  return { ImapFlow };
});
const enviar = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock("resend", () => {
  class Resend { emails = { send: enviar }; }
  return { Resend };
});

import { GET as cron } from "@/app/api/cron/correos-entrantes/route";

const INGEST = "crm.ingest@gmail.com";
const TOKEN = "a".repeat(32);

function respuestaCruda(messageId: string) {
  return [
    `From: Cliente <cliente@ejemplo.com>`,
    `To: crm.ingest+${TOKEN}@gmail.com`,
    `Subject: Re: Propuesta`,
    `Message-ID: <${messageId}>`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    `Sí, nos interesa. Hablemos el lunes.`,
  ].join("\r\n");
}

async function recibidosDeA() {
  return prisma.correoRegistrado.count({ where: { tenantId: A.tenantId, direccion: "RECIBIDO" } });
}

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
  vi.stubEnv("INGEST_EMAIL_BASE", INGEST);
  vi.stubEnv("INGEST_IMAP_PASSWORD", "clave");
  vi.stubEnv("RESEND_API_KEY", "re_prueba");
  imap.uids = []; imap.fuentes.clear(); imap.leidos = [];
  enviar.mockClear();
  // El correo ENVIADO sembrado de A pasa a ser el original del hilo.
  await prisma.correoRegistrado.update({ where: { id: A.correo, tenantId: A.tenantId }, data: { tokenHilo: TOKEN } });
});

afterEach(() => { vi.restoreAllMocks(); });

describe("correos entrantes", () => {
  it("registra la respuesta, avisa al vendedor y la marca leída", async () => {
    imap.uids = [1];
    imap.fuentes.set(1, respuestaCruda("resp-1@cliente"));
    const antes = await recibidosDeA();

    const { status, cuerpo } = await llamarConSecreto();
    expect(status).toBe(200);
    expect(cuerpo, JSON.stringify(cuerpo)).toMatchObject({ procesados: 1, vinculados: 1, reenviados: 1, pendientes: 0 });
    expect(await recibidosDeA()).toBe(antes + 1);
    expect(imap.leidos).toEqual(["1"]);
  });

  it("si ya estaba registrada (corrida cortada antes de marcarla leída), no la duplica ni reenvía el aviso", async () => {
    imap.uids = [1];
    imap.fuentes.set(1, respuestaCruda("resp-1@cliente"));
    await llamarConSecreto(); // primera vez: se registra
    // Simula que quedó sin leer en el buzón (la corrida se cortó).
    imap.leidos = [];
    enviar.mockClear();
    const antes = await recibidosDeA();

    const { status, cuerpo } = await llamarConSecreto();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ procesados: 1, vinculados: 0, reenviados: 0 });
    expect(await recibidosDeA()).toBe(antes);
    expect(enviar).not.toHaveBeenCalled();
    expect(imap.leidos).toEqual(["1"]); // se marca leída para no volver a tomarla
  });

  it("si se acaba el presupuesto de tiempo, deja el resto sin leer para la próxima corrida", async () => {
    imap.uids = [1, 2, 3];
    for (const uid of imap.uids) imap.fuentes.set(uid, respuestaCruda(`resp-${uid}@cliente`));
    // El reloj salta 100 s después de procesar el primer mensaje.
    let llamadas = 0;
    const real = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => (llamadas++ < 2 ? real : real + 100_000));

    const { status, cuerpo } = await llamarConSecreto();
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ procesados: 1, pendientes: 2 });
    expect(imap.leidos).toEqual(["1"]);
  });
});

function llamarConSecreto() {
  return llamarConHeader("Bearer secreto-de-prueba");
}

async function llamarConHeader(authorization: string) {
  const req = new Request("http://pruebas.local/api/cron/correos-entrantes", { headers: { authorization } });
  // El cron no tiene sesión: busca el correo original por su token de hilo (único)
  // sin tenantId a propósito, y de ese original toma el tenant para guardar la
  // respuesta. Por eso la llamada va sin la vigilancia de tenant de las pruebas.
  const respuesta = await sinAislamiento(
    "cron de correos entrantes: el token de hilo identifica el tenant",
    () => (cron as (r: Request) => Promise<Response>)(req),
  );
  let cuerpo: unknown = null;
  try { cuerpo = await respuesta.clone().json(); } catch { /* sin JSON */ }
  return { status: respuesta.status, cuerpo };
}

