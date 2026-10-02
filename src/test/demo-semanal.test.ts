/**
 * Refresco del demo (src/lib/demo-semanal.ts): que el demo se vea vigente mes
 * a mes. Los ganados/perdidos de meses pasados son su historia: no se borran,
 * se completan si faltan, y repetir la corrida no los duplica.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { A, B, sembrar } from "./sembrar";
import { prisma, sinAislamiento } from "./prisma-vigilado";
import { refrescarDemoSemanal } from "@/lib/demo-semanal";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import { componentesHoyBogota } from "@/lib/fecha-bogota";

const refrescar = () =>
  sinAislamiento("el refresco del demo busca el tenant por slug", () =>
    refrescarDemoSemanal(prisma as unknown as PrismaClient, A.tenantId));

/** Ganadas por mes ("AAAA-MM"), por fecha efectiva. */
async function ganadasPorMes(tenantId: string) {
  const ops = await prisma.oportunidad.findMany({
    where: { tenantId, eliminadoEn: null, etapa: "GANADA" },
    select: { fechaCierre: true, fechaEvento: true, creadoEn: true, extras: true },
  });
  const m = new Map<string, number>();
  for (const o of ops) {
    const k = fechaEfectiva(o).toISOString().slice(0, 7);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

beforeEach(async () => {
  await sembrar();
});

describe("refresco del demo", () => {
  it("deja historia en los 11 meses anteriores y ventas en el mes en curso", { timeout: 240_000 }, async () => {
    const r = await refrescar();
    expect(r.ok).toBe(true);

    const porMes = await ganadasPorMes(A.tenantId);
    const hoy = componentesHoyBogota();
    for (let i = 0; i <= 11; i++) {
      const k = new Date(Date.UTC(hoy.anio, hoy.mes - i, 1)).toISOString().slice(0, 7);
      expect(porMes.get(k) ?? 0, `ventas de ${k}`).toBeGreaterThanOrEqual(4);
    }
  });

  it("repetir la corrida conserva la historia, no la duplica y no toca otro tenant", { timeout: 240_000 }, async () => {
    const ganadasB = await prisma.oportunidad.count({ where: { tenantId: B.tenantId } });
    await refrescar();
    const antes = await ganadasPorMes(A.tenantId);

    const r = await refrescar();
    expect(r.historiaGanadosCreados).toBe(0);
    expect(r.historiaPerdidasCreadas).toBe(0);

    const despues = await ganadasPorMes(A.tenantId);
    const hoy = componentesHoyBogota();
    const mesActual = new Date(Date.UTC(hoy.anio, hoy.mes, 1)).toISOString().slice(0, 7);
    for (const [k, n] of antes) {
      if (k === mesActual) continue; // el mes en curso se reemplaza en cada corrida
      expect(despues.get(k), `ventas de ${k}`).toBe(n);
    }
    expect(await prisma.oportunidad.count({ where: { tenantId: B.tenantId } })).toBe(ganadasB);
  });
});
