import { prisma } from "@/lib/prisma";
import { calcularEmbudo, type EmbudoEntrada } from "@/lib/embudo-entrada";

/**
 * Carga y calcula el embudo de un tenant desde `desde`. `soloDe` = id del
 * comercial: ve solo sus oportunidades y las conversaciones que terminaron en
 * un negocio suyo (las que no dejaron datos no son de nadie).
 */
export async function embudoEntrada(tenantId: string, desde: Date, soloDe: string | null): Promise<EmbudoEntrada> {
  const [ops, conversaciones] = await Promise.all([
    prisma.oportunidad.findMany({
      where: {
        tenantId, eliminadoEn: null, origenRenovacionId: null, creadoEn: { gte: desde },
        ...(soloDe ? { creadoBy: soloDe } : {}),
      },
      select: { etapa: true, cambiosEtapa: { select: { etapaNueva: true } } },
    }),
    prisma.conversacionAgente.findMany({
      where: { tenantId, creadoEn: { gte: desde }, ...(soloDe ? { oportunidad: { creadoBy: soloDe } } : {}) },
      select: { oportunidadId: true },
    }),
  ]);
  return calcularEmbudo(ops.map(o => ({ etapa: o.etapa, historial: o.cambiosEtapa.map(c => c.etapaNueva) })), conversaciones);
}
