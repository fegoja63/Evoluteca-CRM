import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const tenantId = session.user.tenantId;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  const [empresas, contactos, oportunidades, cotizaciones, actividades] = await Promise.all([
    prisma.empresa.findMany({
      where: { tenantId, ...ownerFiltro, nombre: { contains: q, mode: "insensitive" } },
      select: { id: true, nombre: true, sector: true },
      take: 5,
    }),
    prisma.contacto.findMany({
      where: {
        tenantId,
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { email:  { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, email: true, cargo: true },
      take: 5,
    }),
    // Busca en título Y en todos los valores del JSON extras
    prisma.oportunidad.findMany({
      where: {
        tenantId,
        ...ownerFiltro,
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { extras: { path: ["CLIENTE"],            string_contains: q } },
          { extras: { path: ["CONTACTO"],           string_contains: q } },
          { extras: { path: ["COTIZACION NUMERO"],  string_contains: q } },
          { extras: { path: ["TIPO SERVICIO"],      string_contains: q } },
          { extras: { path: ["TIPO EVENTO"],        string_contains: q } },
          { extras: { path: ["SEGMENTO"],           string_contains: q } },
          { extras: { path: ["SEDE / SALA"],        string_contains: q } },
        ],
      },
      select: { id: true, titulo: true, etapa: true, extras: true, empresa: { select: { nombre: true } } },
      take: 8,
    }),
    prisma.cotizacion.findMany({
      where: {
        tenantId,
        OR: [
          { empresa: { nombre: { contains: q, mode: "insensitive" } } },
          { sede:    { contains: q, mode: "insensitive" } },
          { notas:   { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, numero: true, estado: true, empresa: { select: { nombre: true } } },
      take: 4,
    }),
    prisma.actividad.findMany({
      where: {
        tenantId,
        ...ownerFiltro,
        OR: [
          { titulo: { contains: q, mode: "insensitive" } },
          { notas:  { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, titulo: true, tipo: true, fecha: true, empresa: { select: { nombre: true } } },
      take: 4,
    }),
  ]);

  const ETAPA_LABEL: Record<string, string> = {
    PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Cotización",
    NEGOCIACION: "Negociación", GANADA: "Ganada", PERDIDA: "Perdida",
  };

  const ESTADO_COT: Record<string, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" };

  const resultados = [
    ...empresas.map(e => ({
      tipo: "cliente" as const,
      id: e.id,
      titulo: e.nombre,
      sub: e.sector ?? "Empresa",
      href: `/dashboard/cuentas/${e.id}`,
    })),
    ...contactos.map(c => ({
      tipo: "contacto" as const,
      id: c.id,
      titulo: c.nombre,
      sub: c.cargo ?? c.email ?? "Contacto",
      href: `/dashboard/contactos/${c.id}`,
    })),
    ...oportunidades.map(o => {
      const extras = o.extras as Record<string, string> | null;
      const clienteExtra = extras?.["CLIENTE"] ?? extras?.["CONTACTO"] ?? "";
      const sub = [ETAPA_LABEL[o.etapa], clienteExtra || o.empresa?.nombre].filter(Boolean).join(" · ");
      return {
        tipo: "oportunidad" as const,
        id: o.id,
        titulo: extras?.["COTIZACION NUMERO"] ? `${extras["COTIZACION NUMERO"]} — ${o.titulo}` : o.titulo,
        sub,
        href: `/dashboard/pipeline/${o.id}`,
      };
    }),
    ...cotizaciones.map(c => ({
      tipo: "cotizacion" as const,
      id: c.id,
      titulo: `Cotización #${String(c.numero).padStart(4,"0")}`,
      sub: [ESTADO_COT[c.estado], c.empresa?.nombre].filter(Boolean).join(" · "),
      href: `/dashboard/cotizaciones-formales/${c.id}`,
    })),
    ...actividades.map(a => ({
      tipo: "actividad" as const,
      id: a.id,
      titulo: a.titulo,
      sub: [a.tipo, a.empresa?.nombre].filter(Boolean).join(" · "),
      href: `/dashboard/agenda`,
    })),
  ];

  return NextResponse.json(resultados);
}
