/** Enlace para agendar: horarios públicos, reserva y configuración en Mi perfil. */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { A, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { GET as horarios, POST as reservar } from "@/app/api/publica/agendar/[token]/route";
import { GET as verAgenda, POST as activar, PUT as guardarHorario, DELETE as apagar } from "@/app/api/perfil/agenda/route";

const TOKEN = "abcdef0123456789abcdef0123456789";
// Todos los días, todo el día y sin aviso mínimo: siempre hay horas libres.
const ABIERTO = { dias: [0, 1, 2, 3, 4, 5, 6], desde: "00:00", hasta: "23:30", duracion: 30, anticipacionHoras: 0, diasAdelante: 3 };

// El enlace público busca al vendedor por su token (no hay sesión).
const publico = <T,>(fn: () => Promise<T>) => sinAislamiento("el enlace para agendar busca al usuario por su token", fn);

type Respuesta = { dias: { horarios: { inicio: string }[] }[] };
async function primeraHora(): Promise<string> {
  const { cuerpo } = await publico(() => llamar(horarios, { params: { token: TOKEN } }));
  return (cuerpo as Respuesta).dias[0].horarios[0].inicio;
}
const datos = (inicio: string, email = "nueva@cliente.test") => ({ inicio, nombre: "Ana Cliente", email, empresa: "Clientes SAS", motivo: "Conocer el servicio" });

beforeAll(async () => {
  vi.stubEnv("RESEND_API_KEY", "");
  await sembrar();
});
afterAll(() => vi.unstubAllEnvs());
beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { tokenAgenda: TOKEN, agendaConfig: ABIERTO } });
  // El límite de reservas por IP es global (en las pruebas todas comparten IP):
  // cada prueba arranca sin el contador de la anterior.
  await sinAislamiento("limpiar el límite de reservas", () => prisma.rateLimit.deleteMany({ where: { clave: { startsWith: "agendar" } } }));
  sinSesion();
});

describe("página pública", () => {
  it("muestra el vendedor y sus horas libres", async () => {
    const { status, cuerpo } = await publico(() => llamar(horarios, { params: { token: TOKEN } }));
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ vendedor: expect.any(String), duracion: 30 });
    expect((cuerpo as Respuesta).dias.length).toBeGreaterThan(0);
  });

  it("un enlace inexistente o apagado responde 404", async () => {
    expect((await publico(() => llamar(horarios, { params: { token: "0".repeat(32) } }))).status).toBe(404);
  });

  it("la reserva crea la reunión en la Agenda del vendedor y el contacto", async () => {
    const inicio = await primeraHora();
    const { status } = await publico(() => llamar(reservar, { params: { token: TOKEN }, body: datos(inicio) }));
    expect(status).toBe(201);
    const reunion = await prisma.actividad.findFirst({
      where: { tenantId: A.tenantId, responsableId: A.comercial, fecha: new Date(inicio) },
      select: { tipo: true, titulo: true, contactoId: true },
    });
    expect(reunion).toMatchObject({ tipo: "REUNION", titulo: "Reunión con Ana Cliente (Clientes SAS)" });
    const contacto = await prisma.contacto.findFirst({ where: { tenantId: A.tenantId, id: reunion!.contactoId! }, select: { email: true } });
    expect(contacto?.email).toBe("nueva@cliente.test");
  });

  it("la misma hora no se puede tomar dos veces y deja de ofrecerse", async () => {
    const inicio = await primeraHora();
    await publico(() => llamar(reservar, { params: { token: TOKEN }, body: datos(inicio) }));
    const otra = await publico(() => llamar(reservar, { params: { token: TOKEN }, body: datos(inicio, "otra@cliente.test") }));
    expect(otra.status).toBe(409);
    expect(await primeraHora()).not.toBe(inicio);
  });

  it("rechaza una hora que no está en el horario", async () => {
    const fuera = "2020-01-01T15:00:00.000Z";
    const { status } = await publico(() => llamar(reservar, { params: { token: TOKEN }, body: datos(fuera) }));
    expect(status).toBe(409);
  });

  it("reutiliza el contacto si el correo ya existe en la cuenta", async () => {
    await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { email: "ya@existe.test" } });
    const inicio = await primeraHora();
    await publico(() => llamar(reservar, { params: { token: TOKEN }, body: datos(inicio, "YA@existe.test") }));
    const reunion = await prisma.actividad.findFirst({ where: { tenantId: A.tenantId, fecha: new Date(inicio) }, select: { contactoId: true, oportunidadId: true } });
    expect(reunion).toEqual({ contactoId: A.contacto, oportunidadId: A.oportunidadDelComercial });
  });
});

describe("Mi perfil › enlace para agendar", () => {
  it("activa, guarda el horario y apaga el enlace", async () => {
    comoUsuario(A, "GERENTE");
    expect((await llamar(verAgenda)).cuerpo).toMatchObject({ enlace: null });
    const act = await llamar(activar, { metodo: "POST" });
    expect((act.cuerpo as { enlace: string }).enlace).toMatch(/\/agendar\/[0-9a-f]{32}$/);
    const g = await llamar(guardarHorario, { metodo: "PUT", body: { ...ABIERTO, duracion: 60 } });
    expect((g.cuerpo as { config: { duracion: number } }).config.duracion).toBe(60);
    const mal = await llamar(guardarHorario, { metodo: "PUT", body: { ...ABIERTO, dias: [] } });
    expect(mal.status).toBe(400);
    await llamar(apagar, { metodo: "DELETE" });
    expect((await llamar(verAgenda)).cuerpo).toMatchObject({ enlace: null });
  });
});
