/**
 * Embudo de entrada en el Panel del Lunes y en el correo del lunes: solo
 * datos del propio tenant, y el comercial solo ve lo suyo.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { A, B, sembrar, sembrarSiHizoFalta } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";
import { GET as panelLunes } from "@/app/api/reportes/lunes/route";
import { GET as resumenSemanal } from "@/app/api/cron/resumen-semanal/route";

type Embudo = { consultas: number; calificados: number; propuestas: number; ventas: number; chat: { conversaciones: number; conDatos: number } };

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  await sembrarSiHizoFalta();
  // A: una conversación del chat que no dejó datos y otra que terminó en el
  // negocio del comercial. B: tres conversaciones que no deben aparecer en A.
  await prisma.conversacionAgente.createMany({
    data: [
      { tenantId: A.tenantId, secreto: "a".repeat(32) },
      { tenantId: A.tenantId, secreto: "b".repeat(32), oportunidadId: A.oportunidadDelComercial },
      ...[1, 2, 3].map(i => ({ tenantId: B.tenantId, secreto: String(i).repeat(32) })),
    ],
  });
});

describe("Panel del Lunes", () => {
  it("el administrador ve el embudo de su cuenta, con el chat", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { status, cuerpo } = await llamar(panelLunes);
    expect(status).toBe(200);
    // Sembrado: un negocio en Prospecto y otro en Negociación + 1 conversación sin datos.
    expect((cuerpo as { embudo: Embudo }).embudo).toEqual({
      consultas: 3, calificados: 1, propuestas: 1, ventas: 0,
      chat: { conversaciones: 2, conDatos: 1 },
    });
  });

  it("el comercial ve solo lo suyo", async () => {
    comoUsuario(A, "COMERCIAL");
    const { cuerpo } = await llamar(panelLunes);
    expect((cuerpo as { embudo: Embudo }).embudo).toEqual({
      consultas: 1, calificados: 0, propuestas: 0, ventas: 0,
      chat: { conversaciones: 1, conDatos: 1 },
    });
  });

  it("no cuenta renovaciones como consultas", async () => {
    await prisma.oportunidad.create({
      data: { tenantId: A.tenantId, titulo: "Renovación", etapa: "PROSPECTO", empresaId: A.empresa, origenRenovacionId: A.oportunidadAjena },
    });
    comoUsuario(A, "ADMINISTRADOR");
    const { cuerpo } = await llamar(panelLunes);
    expect((cuerpo as { embudo: Embudo }).embudo.consultas).toBe(3);
  });
});

describe("correo del lunes", () => {
  it("trae el embudo de entrada", async () => {
    comoUsuario(A, "ADMINISTRADOR");
    const { respuesta } = await llamar(resumenSemanal, {});
    const html = await respuesta.text();
    expect(html).toContain("Embudo de entrada · últimos 30 días");
    expect(html).toContain("Chat web: <strong>2</strong> conversaciones, <strong>1</strong> dejaron sus datos");
  });
});
