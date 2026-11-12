/** CCO inteligente: qué correos se registran y en qué ficha. */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { registrarCorreoCco, tokenDeCco, direccionCco, type CorreoCco } from "@/lib/correo-cco";
import { GET as verCco, POST as generarCco, DELETE as quitarCco } from "@/app/api/perfil/cco/route";

const INGEST = "crm.evoluteca.inbox@gmail.com";
const TOKEN = "0123456789abcdef0123456789abcdef";
const CLIENTE = "cliente@empresa-a.test";
const COMERCIAL = "comercial@tenant-a.test";

// El cron recibe correos de todas las cuentas: busca al usuario por su token.
const cron = (correo: CorreoCco, token = TOKEN) =>
  sinAislamiento("el cron de correos busca al usuario por su token CCO", () => registrarCorreoCco(token, correo, INGEST));

const correo = (c: Partial<CorreoCco> = {}): CorreoCco => ({
  messageId: "<msg-1@mail.test>", de: COMERCIAL, destinatarios: [CLIENTE, `crm.evoluteca.inbox+cco-${TOKEN}@gmail.com`],
  asunto: "Propuesta", cuerpo: "Hola, adjunto la propuesta.", ...c,
});

async function correosDelContacto() {
  return prisma.correoRegistrado.findMany({
    // Solo los de estas pruebas (el contacto sembrado ya trae otros correos).
    where: { tenantId: A.tenantId, contactoId: A.contacto, proveedorMessageId: { startsWith: "<msg-" } },
    select: { direccion: true, creadoBy: true, oportunidadId: true, asunto: true },
  });
}

beforeAll(async () => {
  vi.stubEnv("INGEST_EMAIL_BASE", INGEST);
  await sembrar();
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { tokenCco: TOKEN } });
  await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { email: CLIENTE } });
});

describe("tokenDeCco y dirección", () => {
  it("reconoce solo tokens con el prefijo cco-", () => {
    expect(tokenDeCco(`cco-${TOKEN}`)).toBe(TOKEN);
    expect(tokenDeCco(TOKEN)).toBeNull();
    expect(tokenDeCco("cco-NO-ES-HEX")).toBeNull();
    expect(tokenDeCco(null)).toBeNull();
  });
  it("la dirección cabe en el límite de 64 caracteres de la parte local", () => {
    const dir = direccionCco(INGEST, TOKEN)!;
    expect(dir).toBe(`crm.evoluteca.inbox+cco-${TOKEN}@gmail.com`);
    expect(dir.split("@")[0].length).toBeLessThanOrEqual(64);
  });
});

describe("registro del correo", () => {
  it("un correo enviado por el vendedor queda en la ficha del contacto, ligado a su negocio abierto", async () => {
    const r = await cron(correo());
    expect(r).toEqual({ estado: "registrado", registrados: 1 });
    const [c] = await correosDelContacto();
    expect(c).toMatchObject({ direccion: "ENVIADO", creadoBy: A.comercial, asunto: "Propuesta", oportunidadId: A.oportunidadDelComercial });
  });

  it("no se duplica si llega dos veces", async () => {
    await cron(correo());
    expect(await cron(correo())).toEqual({ estado: "duplicado", registrados: 0 });
    expect(await correosDelContacto()).toHaveLength(1);
  });

  it("un 'responder a todos' del cliente con el vendedor en copia queda como recibido", async () => {
    const r = await cron(correo({ messageId: "<msg-2@mail.test>", de: CLIENTE, destinatarios: [COMERCIAL] }));
    expect(r.registrados).toBe(1);
    const [c] = await correosDelContacto();
    expect(c).toMatchObject({ direccion: "RECIBIDO", creadoBy: null });
  });

  it("ignora un correo en el que el dueño del token no participa (token filtrado)", async () => {
    const r = await cron(correo({ de: "extrano@otro.test", destinatarios: [CLIENTE] }));
    expect(r.estado).toBe("remitente-no-autorizado");
    expect(await correosDelContacto()).toHaveLength(0);
  });

  it("si el destinatario no es contacto, no registra nada", async () => {
    const r = await cron(correo({ destinatarios: ["nadie@desconocido.test"] }));
    expect(r.estado).toBe("sin-contacto");
  });

  it("nunca registra en contactos de otra cuenta con el mismo correo", async () => {
    await prisma.contacto.update({ where: { id: B.contacto, tenantId: B.tenantId }, data: { email: CLIENTE } });
    await cron(correo());
    const enB = await prisma.correoRegistrado.count({ where: { tenantId: B.tenantId, proveedorMessageId: { startsWith: "<msg-" } } });
    expect(enB).toBe(0);
  });

  it("un token revocado ya no registra", async () => {
    await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { tokenCco: null } });
    expect((await cron(correo())).estado).toBe("sin-usuario");
  });
});

describe("Mi perfil › dirección CCO", () => {
  it("genera, muestra y desactiva la dirección del usuario", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(verCco)).cuerpo).toEqual({ disponible: true, direccion: null });
    const { cuerpo } = await llamar(generarCco, { metodo: "POST" });
    expect((cuerpo as { direccion: string }).direccion).toMatch(/^crm\.evoluteca\.inbox\+cco-[0-9a-f]{32}@gmail\.com$/);
    await llamar(quitarCco, { metodo: "DELETE" });
    expect((await llamar(verCco)).cuerpo).toEqual({ disponible: true, direccion: null });
  });
});
