/** Calendario externo: conectar desde Mi perfil y que el enlace para agendar respete sus ocupados. */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { GET as estado, PUT as conectar, DELETE as desconectar } from "@/app/api/perfil/calendario-externo/route";
import { GET as horarios } from "@/app/api/publica/agendar/[token]/route";
import { medianocheBogota } from "@/lib/fecha-bogota";

const URL_GOOGLE = "https://calendar.google.com/calendar/ical/prueba%40gmail.com/private-abc123/basic.ics";
const TOKEN = "fedcba9876543210fedcba9876543210";

// Mañana entre 9:00 y 10:00 (Bogotá) ocupado en Google.
const manana9 = new Date(medianocheBogota(1).getTime() + 9 * 3600_000);
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const ICS = [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pruebas//ES",
  "BEGIN:VEVENT", "UID:ocupado-1", `DTSTART:${stamp(manana9)}`, `DTEND:${stamp(new Date(manana9.getTime() + 3600_000))}`, "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

let pedidas: string[] = [];
beforeAll(async () => { await sembrar(); });
beforeEach(async () => {
  await sembrarSiHizoFalta();
  pedidas = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    pedidas.push(String(url));
    return new Response(ICS, { status: 200, headers: { "Content-Type": "text/calendar" } });
  }));
  await sinAislamiento("limpiar límites de intentos", () => prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "calext" } } }));
});
afterEach(() => vi.unstubAllGlobals());

describe("Mi perfil › calendario externo", () => {
  it("conecta una dirección de Google y no la devuelve después", async () => {
    comoUsuario(A, "COMERCIAL");
    const r = await llamar(conectar, { metodo: "PUT", body: { url: URL_GOOGLE } });
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({ conectado: true, proveedor: "Google Calendar", eventos: 1 });
    const e = await llamar(estado);
    expect(e.cuerpo).toEqual({ conectado: true, proveedor: "Google Calendar" });
    expect(JSON.stringify(e.cuerpo)).not.toContain("private-abc123");
  });

  it("rechaza otros sitios sin siquiera pedirlos", async () => {
    comoUsuario(A, "COMERCIAL");
    const r = await llamar(conectar, { metodo: "PUT", body: { url: "https://169.254.169.254/latest/meta-data" } });
    expect(r.status).toBe(400);
    expect(pedidas).toEqual([]);
  });

  it("desconecta", async () => {
    comoUsuario(A, "COMERCIAL");
    await llamar(conectar, { metodo: "PUT", body: { url: URL_GOOGLE } });
    await llamar(desconectar, { metodo: "DELETE" });
    expect((await llamar(estado)).cuerpo).toEqual({ conectado: false, proveedor: null });
  });
});

describe("enlace para agendar con calendario externo", () => {
  async function horasDeManana(): Promise<string[]> {
    sinSesion();
    const { cuerpo } = await sinAislamiento("el enlace busca al usuario por su token", () => llamar(horarios, { params: { token: TOKEN } }));
    const dias = (cuerpo as { dias: { horarios: { inicio: string }[] }[] }).dias;
    const manana = medianocheBogota(1).getTime();
    return dias.flatMap(d => d.horarios.map(h => h.inicio)).filter(i => {
      const t = new Date(i).getTime();
      return t >= manana && t < manana + 86_400_000;
    });
  }

  beforeEach(async () => {
    await prisma.usuario.update({
      where: { id: A.comercial, tenantId: A.tenantId },
      data: {
        tokenAgenda: TOKEN,
        agendaConfig: { dias: [0, 1, 2, 3, 4, 5, 6], desde: "08:00", hasta: "12:00", duracion: 30, anticipacionHoras: 0, diasAdelante: 3 },
      },
    });
  });

  it("no ofrece las horas ocupadas en Google", async () => {
    await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { calendarioExterno: URL_GOOGLE } });
    const horas = await horasDeManana();
    expect(horas).not.toContain(manana9.toISOString());
    expect(horas).not.toContain(new Date(manana9.getTime() + 30 * 60_000).toISOString());
    expect(horas).toContain(new Date(manana9.getTime() + 3600_000).toISOString()); // 10:00 sí
  });

  it("si Google no responde, el enlace sigue funcionando con la Agenda del CRM", async () => {
    await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { calendarioExterno: URL_GOOGLE.replace("abc123", "caido") } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error", { status: 500 })));
    const horas = await horasDeManana();
    expect(horas).toContain(manana9.toISOString());
  });
});
