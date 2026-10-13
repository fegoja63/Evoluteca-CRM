/**
 * Salud de uso del panel interno (src/lib/salud-uso.ts): que cuente solo lo
 * que hace la gente del cliente y que no mezcle un tenant con otro.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, B, sembrar } from "./sembrar";
import { prisma, sinAislamiento } from "./prisma-vigilado";
import { saludDeUso, nivelDeUso } from "@/lib/salud-uso";

const DIA = 24 * 60 * 60 * 1000;
const salud = () => sinAislamiento("el panel interno mira todos los tenants", () => saludDeUso());

beforeEach(async () => {
  await sembrar();
});

describe("nivel de uso", () => {
  const ahora = new Date("2026-10-13T12:00:00Z");
  it("activo hasta 7 días, enfriándose hasta 30, inactivo después o nunca", () => {
    expect(nivelDeUso(new Date(ahora.getTime() - 2 * DIA), ahora)).toBe("ACTIVO");
    expect(nivelDeUso(new Date(ahora.getTime() - 7 * DIA), ahora)).toBe("ACTIVO");
    expect(nivelDeUso(new Date(ahora.getTime() - 8 * DIA), ahora)).toBe("ENFRIANDOSE");
    expect(nivelDeUso(new Date(ahora.getTime() - 31 * DIA), ahora)).toBe("INACTIVO");
    expect(nivelDeUso(null, ahora)).toBe("INACTIVO");
  });
});

describe("salud de uso", () => {
  it("un inicio de sesión cuenta como uso; una carga de soporte (sin usuario) no", async () => {
    const hace40 = new Date(Date.now() - 40 * DIA);
    // Deja a A sin señales recientes: la siembra crea actividad/cotización hoy.
    await prisma.actividad.updateMany({ where: { tenantId: A.tenantId }, data: { creadoEn: hace40 } });
    await prisma.cotizacion.updateMany({ where: { tenantId: A.tenantId }, data: { creadoEn: hace40 } });
    await sinAislamiento("cambios de etapa cuelgan de la oportunidad", () =>
      prisma.cambioEtapa.deleteMany({ where: { oportunidad: { tenantId: A.tenantId } } }));
    await prisma.registroAuditoria.deleteMany({ where: { tenantId: A.tenantId } });

    await prisma.registroAuditoria.create({
      data: { tenantId: A.tenantId, usuarioNombre: "Evoluteca (soporte)", accion: "CREAR", entidad: "Empresa" },
    });
    expect((await salud())[A.tenantId]?.nivel ?? "INACTIVO").toBe("INACTIVO");

    await prisma.registroAuditoria.create({
      data: { tenantId: A.tenantId, usuarioId: A.comercial, accion: "INICIAR_SESION", entidad: "Usuario", entidadId: A.comercial },
    });
    const s = (await salud())[A.tenantId];
    expect(s.nivel).toBe("ACTIVO");
    expect(s.usuariosActivos30d).toBe(1);
  });

  it("cuenta actividades y próximo paso por tenant, sin mezclar A con B", async () => {
    const antesB = (await salud())[B.tenantId];

    // Una tarea a futuro en una oportunidad abierta de A = próximo paso.
    await prisma.oportunidad.update({ where: { id: A.oportunidadDelComercial }, data: { etapa: "PROSPECTO" } });
    await prisma.actividad.create({
      data: {
        tenantId: A.tenantId, oportunidadId: A.oportunidadDelComercial, tipo: "LLAMADA", titulo: "Seguimiento",
        fecha: new Date(Date.now() + 2 * DIA), completada: false,
      },
    });

    const s = await salud();
    expect(s[A.tenantId].actividades7d).toBeGreaterThanOrEqual(1);
    expect(s[A.tenantId].abiertasConProximoPaso).toBeGreaterThanOrEqual(1);
    expect(s[A.tenantId].abiertasConProximoPaso).toBeLessThanOrEqual(s[A.tenantId].abiertas);
    expect(s[B.tenantId]).toEqual(antesB);
  });
});
