import { prisma } from "@/lib/prisma";
import { conteoVacio, rangoSemana, type Conteo } from "@/lib/actividad-semanal";

// Lo que cada vendedor HIZO en una semana, contado con lo que el CRM ya
// registra (ver INDICADORES en actividad-semanal.ts):
//   · contactos  → Contacto.creadoBy (solo los creados a mano).
//   · negocios   → Oportunidad.creadoBy (el dueño del negocio).
//   · llamadas / reuniones y visitas → actividades hechas; el dueño es el
//     responsable o, si no tiene, quien la creó (igual que las vistas "Mías").
//   · propuestas → cotizaciones que ya no son borrador; dueño: quien la creó o,
//     en las anteriores a este cambio, el dueño del negocio.
export async function actividadReal(tenantId: string, semana: string, userIds: string[]): Promise<Map<string, Conteo>> {
  const res = new Map<string, Conteo>(userIds.map(id => [id, conteoVacio()]));
  if (!userIds.length) return res;
  const { desde, hasta } = rangoSemana(semana);
  const enSemana = { gte: desde, lt: hasta };

  const [contactos, negocios, actividades, cotizaciones] = await Promise.all([
    prisma.contacto.groupBy({
      by: ["creadoBy"],
      where: { tenantId, eliminadoEn: null, creadoBy: { in: userIds }, creadoEn: enSemana },
      _count: { _all: true },
    }),
    prisma.oportunidad.groupBy({
      by: ["creadoBy"],
      where: { tenantId, eliminadoEn: null, creadoBy: { in: userIds }, creadoEn: enSemana },
      _count: { _all: true },
    }),
    prisma.actividad.findMany({
      where: {
        tenantId, completada: true, fecha: enSemana,
        tipo: { in: ["LLAMADA", "REUNION", "VISITA_COMERCIAL", "VISITA_TECNICA"] },
        OR: [{ responsableId: { in: userIds } }, { responsableId: null, creadoBy: { in: userIds } }],
      },
      select: { tipo: true, responsableId: true, creadoBy: true },
    }),
    prisma.cotizacion.findMany({
      where: { tenantId, eliminadoEn: null, estado: { in: ["ENVIADA", "ACEPTADA", "RECHAZADA"] }, creadoEn: enSemana },
      select: { creadoBy: true, oportunidad: { select: { creadoBy: true } } },
    }),
  ]);

  for (const g of contactos) if (g.creadoBy && res.has(g.creadoBy)) res.get(g.creadoBy)!.contactos = g._count._all;
  for (const g of negocios) if (g.creadoBy && res.has(g.creadoBy)) res.get(g.creadoBy)!.negocios = g._count._all;
  for (const a of actividades) {
    const c = res.get(a.responsableId ?? a.creadoBy ?? "");
    if (!c) continue;
    if (a.tipo === "LLAMADA") c.llamadas++;
    else c.reuniones++;
  }
  for (const q of cotizaciones) {
    const c = res.get(q.creadoBy ?? q.oportunidad?.creadoBy ?? "");
    if (c) c.propuestas++;
  }
  return res;
}
