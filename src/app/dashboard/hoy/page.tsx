import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwnerActividad } from "@/lib/permisos";
import { medianocheBogota } from "@/lib/fecha-bogota";
import { estadoComercial, ultimoMovimientoDe, inicioProximoPaso } from "@/lib/estado-comercial";
import { BandejaHoy, type ItemBandeja } from "@/components/bandeja-hoy";

export const dynamic = "force-dynamic";

// Sugerencia cuando la actividad no está ligada a un negocio: según su tipo.
const SUGERENCIA_POR_TIPO: Record<string, string> = {
  LLAMADA: "Llama y deja anotado lo que se habló.",
  EMAIL: "Escribe el correo y agenda el siguiente paso.",
  REUNION: "Repasa la ficha antes de la reunión y anota acuerdos al terminar.",
  TAREA: "Hazla y márcala como hecha.",
  VISITA_COMERCIAL: "Lleva la propuesta y anota lo que veas en la visita.",
  VISITA_TECNICA: "Confirma la hora y registra lo revisado.",
};

/**
 * Bandeja Hoy: lo pendiente de hoy y lo vencido, uno por uno, con la acción
 * para despacharlo (Hacer, Reprogramar, Hecha).
 */
export default async function BandejaHoyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { tenantId, rol, id: userId } = session.user;
  const ahora = new Date();
  const finHoy = medianocheBogota(1, ahora);

  const [actividades, tenant] = await Promise.all([
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { lt: finHoy }, ...filtroOwnerActividad(rol, userId) },
      orderBy: { fecha: "asc" },
      take: 100,
      select: {
        id: true, titulo: true, tipo: true, fecha: true, notas: true,
        responsable: { select: { nombre: true } },
        empresa: { select: { id: true, nombre: true, telefono: true, email: true } },
        contacto: { select: { id: true, nombre: true, telefono: true, email: true } },
        oportunidad: {
          select: {
            id: true, titulo: true, etapa: true, valor: true, probabilidad: true, fechaCierre: true, creadoEn: true,
            actividades: { where: { fecha: { lte: ahora } }, orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
            cambiosEtapa: { orderBy: { creadoEn: "desc" }, take: 1, select: { creadoEn: true } },
            correos: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
            _count: { select: { actividades: { where: { completada: false, fecha: { gte: inicioProximoPaso() } } } } },
          },
        },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { diasEstancamiento: true } }),
  ]);
  const umbral = tenant?.diasEstancamiento ?? 14;

  const items: ItemBandeja[] = actividades.map(a => {
    const o = a.oportunidad;
    const estado = o
      ? estadoComercial(
          { etapa: o.etapa, probabilidad: o.probabilidad, ultimoMovimiento: ultimoMovimientoDe(o), creadoEn: o.creadoEn, fechaCierre: o.fechaCierre, tieneProximoPaso: o._count.actividades > 0 },
          umbral,
          ahora,
        )
      : null;
    const vencida = a.fecha < medianocheBogota(0, ahora);
    const cerrado = o && (o.etapa === "GANADA" || o.etapa === "PERDIDA");
    // Prioridad de la sugerencia: negocio cerrado → vencida → estado comercial
    // del negocio → según el tipo de actividad.
    const sugerencia = cerrado
      ? { titulo: "El negocio ya está cerrado: si esta actividad ya no aplica, márcala como hecha.", razon: null }
      : vencida
        ? { titulo: "Está vencida: hazla hoy o reprográmala para una fecha realista.", razon: estado ? `${estado.label}: ${estado.razon}` : null }
        : estado
          ? { titulo: estado.accion, razon: `${estado.label}: ${estado.razon}` }
          : { titulo: SUGERENCIA_POR_TIPO[a.tipo] ?? "Hazla y márcala como hecha.", razon: null };
    return {
      id: a.id,
      titulo: a.titulo,
      tipo: a.tipo,
      fecha: a.fecha.toISOString(),
      vencida,
      notas: a.notas,
      responsable: a.responsable?.nombre ?? null,
      empresa: a.empresa,
      contacto: a.contacto,
      oportunidad: o ? { id: o.id, titulo: o.titulo, etapa: o.etapa, valor: o.valor ? Number(o.valor) : null } : null,
      sugerencia,
    };
  });

  return <BandejaHoy itemsIniciales={items} />;
}
