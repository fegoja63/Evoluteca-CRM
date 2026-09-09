import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import { filtroOwner, filtroOwnerActividad } from "@/lib/permisos";
import { componentesHoyBogota, medianocheBogota } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

// "Panel del Lunes": indicadores de cadencia semanal que NO dependen de los
// filtros históricos (año/mes) de la pantalla de Reportes. Siempre miran el
// AHORA — la foto que un vendedor revisa cada lunes:
//   3. Actividad comercial — cuántas llamadas/reuniones/visitas/propuestas en 7 días.
//   5. Ticket promedio     — valor medio de una operación ganada (últimos 12 meses).
//   7. Movimiento de clientes — nuevos / activos / inactivos / perdidos.
//
// Etapas que cuentan como "negocio en curso" (ni ganado ni perdido).
const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];

// Un cliente sin negocio en curso y sin actividad en este umbral se considera
// "inactivo" (enfriándose). Mismo espíritu que Tenant.diasEstancamiento pero a
// nivel de cliente, no de oportunidad; se deja fijo para no acoplarlo a esa
// palanca (que rige el estancamiento de oportunidades).
const DIAS_INACTIVIDAD = 60;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const rol = session.user.rol;
  const userId = session.user.id;

  // Un COMERCIAL solo ve lo suyo (igual que el resto del CRM).
  const ownerFiltro = filtroOwner(rol, userId);
  const ownerFiltroActividad = filtroOwnerActividad(rol, userId);

  // ── Ventanas de tiempo, ancladas al calendario de Bogotá ──
  const { anio, mes } = componentesHoyBogota();
  const ahora        = new Date();
  const hace7dias    = medianocheBogota(-7);
  const hace60dias   = medianocheBogota(-DIAS_INACTIVIDAD);
  const inicioMes    = new Date(Date.UTC(anio, mes, 1, 5, 0, 0));
  const hace12meses  = new Date(Date.UTC(anio, mes - 12, 1, 5, 0, 0));

  const [actividades7d, cotizaciones7d, empresas, ganadas, perdidasMes] = await Promise.all([
    // 3. Actividad comercial: toques del equipo en los últimos 7 días. Se cuenta
    //    por `fecha` (cuándo ocurrió/ocurre la actividad), acotado a fecha<=ahora
    //    para no contar lo agendado a futuro como ya hecho.
    prisma.actividad.findMany({
      where: { tenantId, fecha: { gte: hace7dias, lte: ahora }, ...ownerFiltroActividad },
      select: { tipo: true, responsable: { select: { id: true, nombre: true } }, creadoBy: true },
    }),
    // "Propuestas" de la semana: cotizaciones enviadas (no borradores) creadas en
    // los últimos 7 días.
    prisma.cotizacion.count({
      where: { tenantId, eliminadoEn: null, estado: { in: ["ENVIADA", "ACEPTADA", "RECHAZADA"] }, creadoEn: { gte: hace7dias } },
    }),
    // 7. Movimiento de clientes: foto de toda la cartera con lo mínimo para
    //    clasificar cada empresa (negocios en curso + última actividad).
    prisma.empresa.findMany({
      where: { tenantId, eliminadoEn: null, ...ownerFiltro },
      select: {
        id: true,
        creadoEn: true,
        oportunidades: { where: { eliminadoEn: null }, select: { etapa: true } },
        actividades: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
      },
    }),
    // 5. Ticket promedio: operaciones ganadas para promediar su valor (se filtra
    //    a los últimos 12 meses en JS vía fechaEfectiva).
    prisma.oportunidad.findMany({
      where: { tenantId, eliminadoEn: null, etapa: "GANADA", ...ownerFiltro },
      select: { valor: true, fechaCierre: true, fechaEvento: true, creadoEn: true, extras: true },
    }),
    // Clientes perdidos ESTE MES: empresas con al menos una oportunidad que pasó
    // a PERDIDA dentro del mes en curso (por el registro de cambio de etapa, que
    // sí tiene fecha real del cambio).
    prisma.cambioEtapa.findMany({
      where: {
        etapaNueva: "PERDIDA",
        creadoEn: { gte: inicioMes },
        oportunidad: { tenantId, eliminadoEn: null, ...ownerFiltro },
      },
      select: { oportunidad: { select: { empresaId: true } } },
    }),
  ]);

  // ── 3. Actividad comercial (últimos 7 días) ──
  // Se agrupan VISITA_COMERCIAL y VISITA_TECNICA bajo "VISITA" para la lectura.
  const actividadPorTipo: Record<string, number> = { LLAMADA: 0, REUNION: 0, VISITA: 0, EMAIL: 0, TAREA: 0 };
  for (const a of actividades7d) {
    const key = a.tipo === "VISITA_COMERCIAL" || a.tipo === "VISITA_TECNICA" ? "VISITA" : a.tipo;
    actividadPorTipo[key] = (actividadPorTipo[key] ?? 0) + 1;
  }
  const totalActividad = actividades7d.length;

  // Actividad por vendedor (solo para roles con visión de equipo). Se agrupa por
  // responsable; sin responsable cae en "creadoBy" o "Sin asignar".
  let actividadPorVendedor: { nombre: string; total: number }[] = [];
  if (rol !== "COMERCIAL") {
    const mapV = new Map<string, { nombre: string; total: number }>();
    for (const a of actividades7d) {
      const id = a.responsable?.id ?? a.creadoBy ?? "sin";
      const nombre = a.responsable?.nombre ?? "Sin asignar";
      const entry = mapV.get(id) ?? { nombre, total: 0 };
      entry.total++;
      mapV.set(id, entry);
    }
    actividadPorVendedor = Array.from(mapV.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }

  // ── 5. Ticket promedio (últimos 12 meses; fallback a todo el histórico) ──
  const ganadas12m = ganadas.filter(o => fechaEfectiva(o) >= hace12meses && Number(o.valor ?? 0) > 0);
  const baseTicket = ganadas12m.length > 0 ? ganadas12m : ganadas.filter(o => Number(o.valor ?? 0) > 0);
  const sumaTicket = baseTicket.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);
  const ticketPromedio = baseTicket.length > 0 ? Math.round(sumaTicket / baseTicket.length) : 0;
  const ticketVentana = ganadas12m.length > 0 ? "12m" : "historico";

  // ── 7. Movimiento de clientes ──
  let nuevos = 0, activos = 0, inactivos = 0;
  for (const e of empresas) {
    if (e.creadoEn >= inicioMes) nuevos++;
    const tieneActiva = e.oportunidades.some(o => ETAPAS_ACTIVAS.includes(o.etapa));
    if (tieneActiva) {
      activos++;
    } else {
      const ultimaActividad = e.actividades[0]?.fecha ?? null;
      if (!ultimaActividad || ultimaActividad < hace60dias) inactivos++;
    }
  }
  const empresasPerdidasMes = new Set(
    perdidasMes.map(c => c.oportunidad?.empresaId).filter((id): id is string => !!id)
  );
  const perdidos = empresasPerdidasMes.size;

  return NextResponse.json({
    actividad: {
      total: totalActividad,
      porTipo: actividadPorTipo,
      propuestas: cotizaciones7d,
      porVendedor: actividadPorVendedor,
    },
    ticketPromedio: {
      valor: ticketPromedio,
      operaciones: baseTicket.length,
      ventana: ticketVentana,
    },
    clientes: {
      total: empresas.length,
      nuevos,
      activos,
      inactivos,
      perdidos,
    },
  });
}
