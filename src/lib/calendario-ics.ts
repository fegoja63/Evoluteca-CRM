import { prisma } from "@/lib/prisma";
import { filtroOwnerActividad } from "@/lib/permisos";

/** Mismos filtros que ofrece la Agenda, para poder exportar solo lo que se ve. */
export type FiltroAgenda = "pendientes" | "todas" | "vencidas" | "asignadas";

export function esFiltroAgenda(v: string | null): v is FiltroAgenda {
  return v === "pendientes" || v === "todas" || v === "vencidas" || v === "asignadas";
}

function condicionFiltro(filtro: FiltroAgenda, userId: string) {
  switch (filtro) {
    case "todas":     return {};
    case "vencidas":  return { completada: false, fecha: { lt: new Date() } };
    case "asignadas": return { completada: false, responsableId: userId };
    case "pendientes":
    default:          return { completada: false };
  }
}

const ETIQUETA_FILTRO: Record<FiltroAgenda, string> = {
  pendientes: "Pendientes",
  todas:      "Todas",
  vencidas:   "Vencidas",
  asignadas:  "Asignadas a mí",
};

// Escapa los caracteres con significado especial en el formato iCalendar (RFC 5545).
function escIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// Formatea una fecha como marca UTC de iCalendar: 20260719T113300Z.
function fmtDt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const TIPO_MAP: Record<string, string> = {
  LLAMADA: "📞 Llamada",
  REUNION: "🤝 Reunión",
  TAREA:   "✅ Tarea",
  EMAIL:   "✉️ Email",
  VISITA_COMERCIAL: "🏢 Visita comercial",
  VISITA_TECNICA:   "🔧 Visita técnica",
};

/**
 * Genera el calendario iCalendar (.ics) de la agenda de un usuario, respetando
 * el filtro por rol: un COMERCIAL ve las actividades que creó o que le fueron
 * asignadas — el mismo criterio que usa la Agenda (/api/actividades), para que
 * el calendario no se quede sin las tareas que otros le asignaron.
 * Lo comparten la descarga puntual autenticada (/api/exportar/actividades-ics)
 * y la suscripción en vivo (/api/calendario/[token]).
 */
export async function generarIcsAgenda(opts: {
  tenantId: string;
  rol: string | undefined;
  userId: string;
  nombre: string | null;
  /** Qué subconjunto exportar. Por defecto, las pendientes. */
  filtro?: FiltroAgenda;
}): Promise<string> {
  const filtro = opts.filtro ?? "pendientes";
  const ownerFiltro = filtroOwnerActividad(opts.rol, opts.userId);

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: opts.tenantId, ...condicionFiltro(filtro, opts.userId), ...ownerFiltro },
    orderBy: { fecha: "asc" },
    include: {
      empresa:     { select: { nombre: true } },
      oportunidad: { select: { titulo: true } },
    },
  });

  const ahora = fmtDt(new Date());
  const uid_domain = "evoluteca-crm.vercel.app";

  const eventos = actividades.map(a => {
    const inicio = new Date(a.fecha);
    const fin    = new Date(inicio.getTime() + 60 * 60 * 1000); // +1h por defecto

    const titulo = `${TIPO_MAP[a.tipo] ?? a.tipo}: ${escIcs(a.titulo)}`;
    const partes = [
      a.empresa?.nombre     ? `Cliente: ${a.empresa.nombre}` : null,
      a.oportunidad?.titulo ? `Negocio: ${a.oportunidad.titulo}` : null,
      a.notas               ? `Notas: ${a.notas}` : null,
    ].filter(Boolean);

    return [
      "BEGIN:VEVENT",
      `UID:${a.id}@${uid_domain}`,
      `DTSTAMP:${ahora}`,
      `DTSTART:${fmtDt(inicio)}`,
      `DTEND:${fmtDt(fin)}`,
      `SUMMARY:${titulo}`,
      partes.length ? `DESCRIPTION:${escIcs(partes.join("\\n"))}` : null,
      "STATUS:CONFIRMED",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Evoluteca CRM//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    // La suscripción en vivo usa el filtro por defecto, así que conserva el
    // nombre limpio de siempre; solo las descargas filtradas se etiquetan.
    `X-WR-CALNAME:Evoluteca CRM — ${opts.nombre ?? "Agenda"}${filtro !== "pendientes" ? ` (${ETIQUETA_FILTRO[filtro]})` : ""}`,
    "X-WR-TIMEZONE:America/Bogota",
    // Sugiere a Google/Outlook cada cuánto refrescar la suscripción (1 hora).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...eventos,
    "END:VCALENDAR",
  ].join("\r\n");
}
