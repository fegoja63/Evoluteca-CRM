/** Secuencias de seguimiento: inscripción, envíos, frenos y permisos. */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, sinSesion, llamar } from "../helpers";
import { prisma, sinAislamiento } from "../prisma-vigilado";

// El envío real (Resend) se reemplaza: se anota qué saldría.
const enviados = vi.hoisted(() => ({ lista: [] as { para: string; asunto: string; cuerpo: string; remitente: string }[] }));
vi.mock("@/lib/enviar-correo", () => ({
  enviarCorreoAlCliente: async (c: { para: string; asunto: string; cuerpo: string; remitente: { email: string } }) => {
    enviados.lista.push({ para: c.para, asunto: c.asunto, cuerpo: c.cuerpo, remitente: c.remitente.email });
    return { ok: true, registro: {} };
  },
}));

import { POST as crearSecuencia } from "@/app/api/secuencias/route";
import { POST as inscribirRuta } from "@/app/api/secuencias/inscripciones/route";
import { DELETE as detenerRuta } from "@/app/api/secuencias/inscripciones/[id]/route";
import { GET as cron } from "@/app/api/cron/secuencias/route";
import { procesarSecuencias } from "@/lib/secuencias";

const CORREO_CLIENTE = "cliente@empresa-a.test";
const PASOS = [
  { diasEspera: 0, asunto: "Hola {{nombre}}", cuerpo: "Primer correo de {{vendedor}}" },
  { diasEspera: 3, asunto: "Seguimiento", cuerpo: "Segundo" },
];

// El cron recorre todas las cuentas: en las pruebas se le quita el guardián.
const correrCron = (ahora: Date) => sinAislamiento("el cron de secuencias recorre todas las cuentas", () => procesarSecuencias(ahora));

async function crearEInscribir() {
  comoUsuario(A, "GERENTE");
  const { cuerpo } = await llamar(crearSecuencia, { body: { nombre: "Seguimiento", pasos: PASOS } });
  const secuenciaId = (cuerpo as { id: string }).id;
  comoUsuario(A, "COMERCIAL");
  const r = await llamar(inscribirRuta, { body: { secuenciaId, contactoId: A.contacto, oportunidadId: A.oportunidadDelComercial } });
  return { secuenciaId, r };
}

async function inscripcionNueva() {
  return prisma.inscripcionSecuencia.findFirst({
    where: { tenantId: A.tenantId, contactoId: A.contacto, id: { not: A.inscripcionSecuencia } },
    orderBy: { creadoEn: "desc" },
  });
}

beforeAll(async () => {
  await sembrar();
});
beforeEach(async () => {
  await sembrarSiHizoFalta();
  enviados.lista = [];
  // El contacto sembrado ya tiene una inscripción activa (lejana): se cierra para poder inscribirlo.
  await prisma.inscripcionSecuencia.update({ where: { id: A.inscripcionSecuencia, tenantId: A.tenantId }, data: { estado: "COMPLETADA", proximoEnvio: null } });
  await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { email: CORREO_CLIENTE, nombre: "Ana María Pérez" } });
});

describe("inscribir", () => {
  it("el primer correo sale de inmediato, con las variables y a nombre de quien inscribe", async () => {
    const { r } = await crearEInscribir();
    expect(r.status).toBe(201);
    expect(enviados.lista).toHaveLength(1);
    expect(enviados.lista[0]).toMatchObject({ para: CORREO_CLIENTE, asunto: "Hola Ana", remitente: "comercial@tenant-a.test" });
    const ins = await inscripcionNueva();
    expect(ins).toMatchObject({ estado: "ACTIVA", pasoSiguiente: 1, enviados: 1 });
  });

  it("no deja inscribir dos veces al mismo contacto", async () => {
    const { secuenciaId } = await crearEInscribir();
    const otra = await llamar(inscribirRuta, { body: { secuenciaId, contactoId: A.contacto } });
    expect(otra.status).toBe(409);
  });

  it("no inscribe un contacto sin correo", async () => {
    await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { email: null } });
    const { r } = await crearEInscribir();
    expect(r.status).toBe(400);
  });
});

describe("envíos del cron", () => {
  it("envía el siguiente paso el día que toca y completa la secuencia", async () => {
    await crearEInscribir();
    const ins = await inscripcionNueva();
    await correrCron(new Date(ins!.proximoEnvio!.getTime() - 60_000)); // un minuto antes: nada
    expect(enviados.lista).toHaveLength(1);
    await correrCron(new Date(ins!.proximoEnvio!.getTime() + 60_000));
    expect(enviados.lista).toHaveLength(2);
    expect((await inscripcionNueva())).toMatchObject({ estado: "COMPLETADA", enviados: 2 });
  });

  it("se detiene si el cliente respondió", async () => {
    await crearEInscribir();
    const ins = await inscripcionNueva();
    await prisma.correoRegistrado.create({
      data: { tenantId: A.tenantId, contactoId: A.contacto, direccion: "RECIBIDO", de: CORREO_CLIENTE, para: "x", asunto: "Re: Hola", cuerpo: "Me interesa", fecha: new Date() },
    });
    await correrCron(new Date(ins!.proximoEnvio!.getTime() + 60_000));
    expect(enviados.lista).toHaveLength(1);
    expect(await inscripcionNueva()).toMatchObject({ estado: "DETENIDA", motivoFin: "RESPONDIO" });
  });

  it("se detiene si el negocio se ganó", async () => {
    await crearEInscribir();
    const ins = await inscripcionNueva();
    await prisma.oportunidad.update({ where: { id: A.oportunidadDelComercial, tenantId: A.tenantId }, data: { etapa: "GANADA" } });
    await correrCron(new Date(ins!.proximoEnvio!.getTime() + 60_000));
    expect(await inscripcionNueva()).toMatchObject({ estado: "DETENIDA", motivoFin: "NEGOCIO_CERRADO" });
  });

  it("el endpoint del cron exige CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-pruebas");
    sinSesion();
    expect((await llamar(cron)).status).toBe(401);
    vi.unstubAllEnvs();
  });
});

describe("permisos", () => {
  it("un comercial no crea secuencias", async () => {
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(crearSecuencia, { body: { nombre: "Mía", pasos: PASOS } })).status).toBe(403);
  });

  it("un comercial no detiene la secuencia que inició otro; el gerente sí", async () => {
    await crearEInscribir();
    const ins = await inscripcionNueva();
    await prisma.inscripcionSecuencia.update({ where: { id: ins!.id, tenantId: A.tenantId }, data: { usuarioId: A.admin } });
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(detenerRuta, { metodo: "DELETE", params: { id: ins!.id } })).status).toBe(403);
    comoUsuario(A, "GERENTE");
    expect((await llamar(detenerRuta, { metodo: "DELETE", params: { id: ins!.id } })).status).toBe(200);
    expect(await inscripcionNueva()).toMatchObject({ estado: "DETENIDA", motivoFin: "MANUAL" });
  });

  it("otra cuenta no puede inscribir en una secuencia ajena", async () => {
    const { secuenciaId } = await crearEInscribir();
    comoUsuario(B, "ADMINISTRADOR");
    const r = await llamar(inscribirRuta, { body: { secuenciaId, contactoId: B.contacto } });
    expect(r.status).toBe(404);
  });
});

describe("pasos de llamada y WhatsApp", () => {
  const MIXTA = [
    { canal: "WHATSAPP", diasEspera: 0, cuerpo: "Hola {{nombre}}, le escribe {{vendedor}}" },
    { canal: "LLAMADA", diasEspera: 2, asunto: "Dudas", cuerpo: "Preguntar qué le pareció" },
    { canal: "EMAIL", diasEspera: 3, asunto: "Resumen", cuerpo: "Correo" },
  ];

  async function inscribirMixta() {
    comoUsuario(A, "GERENTE");
    const { cuerpo } = await llamar(crearSecuencia, { body: { nombre: "Mixta", pasos: MIXTA } });
    comoUsuario(A, "COMERCIAL");
    return llamar(inscribirRuta, { body: { secuenciaId: (cuerpo as { id: string }).id, contactoId: A.contacto, oportunidadId: A.oportunidadDelComercial } });
  }

  it("el WhatsApp queda como tarea de hoy del vendedor, con el mensaje y el enlace; no sale correo", async () => {
    await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { telefono: "300 123 4567" } });
    const r = await inscribirMixta();
    expect(r.status).toBe(201);
    expect(enviados.lista).toHaveLength(0);
    const tarea = await prisma.actividad.findFirst({ where: { tenantId: A.tenantId, titulo: "WhatsApp a Ana María Pérez" } });
    expect(tarea).toMatchObject({ tipo: "TAREA", responsableId: A.comercial, contactoId: A.contacto, oportunidadId: A.oportunidadDelComercial, completada: false });
    expect(tarea?.notas).toContain("Hola Ana, le escribe Comercial");
    expect(tarea?.notas).toContain("Abrir WhatsApp: https://wa.me/573001234567?text=Hola%20Ana");
    expect(await inscripcionNueva()).toMatchObject({ estado: "ACTIVA", pasoSiguiente: 1 });
  });

  it("la llamada queda como llamada con el guion; después sale el correo", async () => {
    await inscribirMixta();
    const ins = await inscripcionNueva();
    await correrCron(new Date(ins!.proximoEnvio!.getTime() + 60_000));
    const llamada = await prisma.actividad.findFirst({ where: { tenantId: A.tenantId, tipo: "LLAMADA", titulo: "Llamar a Ana María Pérez — Dudas" } });
    expect(llamada?.notas).toContain("Preguntar qué le pareció");
    const despues = await inscripcionNueva();
    await correrCron(new Date(despues!.proximoEnvio!.getTime() + 60_000));
    expect(enviados.lista.map(e => e.asunto)).toEqual(["Resumen"]);
    expect(await inscripcionNueva()).toMatchObject({ estado: "COMPLETADA" });
  });

  it("sin celular la tarea lo dice y no trae enlace", async () => {
    await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { telefono: null } });
    await prisma.empresa.update({ where: { id: A.empresa, tenantId: A.tenantId }, data: { telefono: null } });
    await inscribirMixta();
    const tarea = await prisma.actividad.findFirst({ where: { tenantId: A.tenantId, titulo: "WhatsApp a Ana María Pérez" } });
    expect(tarea?.notas).toContain("no tiene celular");
    expect(tarea?.notas).not.toContain("wa.me");
  });

  it("un contacto sin correo puede entrar a una secuencia sin correos, pero no a una con correos", async () => {
    await prisma.contacto.update({ where: { id: A.contacto, tenantId: A.tenantId }, data: { email: null } });
    comoUsuario(A, "GERENTE");
    const solo = await llamar(crearSecuencia, { body: { nombre: "Solo llamadas", pasos: [MIXTA[1]] } });
    const mixta = await llamar(crearSecuencia, { body: { nombre: "Mixta", pasos: MIXTA } });
    comoUsuario(A, "COMERCIAL");
    expect((await llamar(inscribirRuta, { body: { secuenciaId: (mixta.cuerpo as { id: string }).id, contactoId: A.contacto } })).status).toBe(400);
    expect((await llamar(inscribirRuta, { body: { secuenciaId: (solo.cuerpo as { id: string }).id, contactoId: A.contacto } })).status).toBe(201);
  });
});
