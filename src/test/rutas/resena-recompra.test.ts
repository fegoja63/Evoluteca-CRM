/**
 * Reseña y recompra: el cron deja la tarea al dueño del negocio ganado, una
 * sola vez, solo en las cuentas que lo activaron; la configuración es de
 * administradores.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";
import { procesarResenaRecompra, CONFIG_POR_DEFECTO } from "@/lib/resena-recompra";
import { GET as verConfig, PUT as guardarConfig } from "@/app/api/configuracion/resena-recompra/route";

const DIA = 86_400_000;
const AHORA = new Date();
const hace = (dias: number) => new Date(AHORA.getTime() - dias * DIA);
const ENLACE = "https://g.page/r/demo/review";
const ACTIVA = {
  resena: { ...CONFIG_POR_DEFECTO.resena, activa: true, dias: 15, enlace: ENLACE },
  recompra: { ...CONFIG_POR_DEFECTO.recompra, activa: true, dias: 90 },
};
// El cron recorre todas las cuentas.
const correr = () => sinAislamiento("el cron de reseña y recompra recorre todas las cuentas", () => procesarResenaRecompra(AHORA));

async function negocioGanado(t: typeof A, dias: number, extra: { empresaId?: string; creadoBy?: string } = {}) {
  return prisma.oportunidad.create({
    data: {
      tenantId: t.tenantId, titulo: `Venta de ${dias} días ${t.tenantId}`, etapa: "GANADA", fechaCierre: hace(dias),
      empresaId: extra.empresaId ?? t.empresa, contactoId: t.contacto, creadoBy: extra.creadoBy ?? t.comercial,
    },
  });
}
const tareas = (t: typeof A, titulo: string) => prisma.actividad.findMany({ where: { tenantId: t.tenantId, titulo: { startsWith: titulo } } });

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  await prisma.tenant.update({ where: { id: A.tenantId }, data: { resenaRecompraConfig: ACTIVA } });
  await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { nombre: "Ana María Pérez", telefono: "3001234567" } });
});

describe("pedir reseña", () => {
  it("15 días después de ganar, deja la tarea al dueño con el mensaje y el enlace, una sola vez", async () => {
    const op = await negocioGanado(A, 16);
    await correr();
    const [t] = await tareas(A, "Pedir reseña a Ana María Pérez");
    expect(t).toMatchObject({ tipo: "TAREA", responsableId: A.comercial, oportunidadId: op.id, completada: false });
    expect(t.notas).toContain(`Gracias por confiar en nosotros con Venta de 16 días ${A.tenantId}`);
    expect(t.notas).toContain(ENLACE);
    expect(t.notas).toContain("Abrir WhatsApp: https://wa.me/573001234567");
    expect((await prisma.oportunidad.findFirst({ where: { id: op.id, tenantId: A.tenantId } }))?.resenaPedidaEn).not.toBeNull();
    await correr();
    expect(await tareas(A, "Pedir reseña")).toHaveLength(1);
  });

  it("no toca negocios muy recientes ni de hace mucho, ni cuentas que no lo activaron", async () => {
    await negocioGanado(A, 5);
    await negocioGanado(A, 60);
    await negocioGanado(B, 16);
    await correr();
    expect(await tareas(A, "Pedir reseña")).toHaveLength(0);
    expect(await tareas(B, "Pedir reseña")).toHaveLength(0);
  });

  it("si el dueño ya no está activo, la tarea va al administrador", async () => {
    await prisma.usuario.update({ where: { id: A.comercial, tenantId: A.tenantId }, data: { activo: false } });
    await negocioGanado(A, 16);
    await correr();
    const [t] = await tareas(A, "Pedir reseña");
    expect(t.responsableId).toBe(A.admin);
  });
});

describe("ofrecer recompra", () => {
  it("90 días después, si el cliente no tiene otro negocio en curso", async () => {
    const empresa = await prisma.empresa.create({ data: { tenantId: A.tenantId, nombre: "Cliente sin negocios abiertos" } });
    await negocioGanado(A, 91, { empresaId: empresa.id });
    // El cliente sembrado sí tiene negocios en curso: no se le ofrece.
    await negocioGanado(A, 92);
    await correr();
    const lista = await tareas(A, "Ofrecer recompra");
    expect(lista).toHaveLength(1);
    expect(lista[0].empresaId).toBe(empresa.id);
  });
});

describe("configuración", () => {
  it("solo el administrador; la reseña activa necesita enlace", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(verConfig)).status).toBe(403);
    comoUsuario(A, "ADMINISTRADOR");
    const mala = await llamar(guardarConfig, { metodo: "PUT", body: { ...ACTIVA, resena: { ...ACTIVA.resena, enlace: "" } } });
    expect(mala.status).toBe(400);
    const buena = await llamar(guardarConfig, { metodo: "PUT", body: ACTIVA });
    expect(buena.status).toBe(200);
    expect((await llamar(verConfig)).cuerpo).toMatchObject({ resena: { activa: true, enlace: ENLACE } });
  });
});
