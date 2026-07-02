import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

export const dynamic = "force-dynamic";

function escIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fmtDt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const TIPO_MAP: Record<string, string> = {
  LLAMADA: "📞 Llamada",
  REUNION: "🤝 Reunión",
  TAREA:   "✅ Tarea",
  EMAIL:   "✉️ Email",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: session.user.tenantId, completada: false, ...ownerFiltro },
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

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Evoluteca CRM//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Evoluteca CRM — ${session.user.name ?? "Agenda"}`,
    "X-WR-TIMEZONE:America/Bogota",
    ...eventos,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agenda-evoluteca-${new Date().toISOString().slice(0,10)}.ics"`,
    },
  });
}
