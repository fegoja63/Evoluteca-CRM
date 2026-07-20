import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { numeroCotizacion } from "@/lib/cotizaciones";

export async function GET(_req: Request, { params }: { params: { empresaId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const tid = session.user.tenantId;
  const eid = params.empresaId;

  const [actividades, oportunidades, cotizaciones, eventos] = await Promise.all([
    prisma.actividad.findMany({
      where: { tenantId: tid, empresaId: eid },
      select: { id: true, tipo: true, titulo: true, fecha: true, completada: true, notas: true, creadoEn: true },
      orderBy: { creadoEn: "desc" }, take: 50,
    }),
    prisma.oportunidad.findMany({
      where: { tenantId: tid, empresaId: eid, eliminadoEn: null },
      select: { id: true, titulo: true, etapa: true, valor: true, creadoEn: true },
      orderBy: { creadoEn: "desc" }, take: 50,
    }),
    prisma.cotizacion.findMany({
      where: { tenantId: tid, empresaId: eid, eliminadoEn: null },
      select: { id: true, numero: true, numeroManual: true, estado: true, creadoEn: true },
      orderBy: { creadoEn: "desc" }, take: 50,
    }),
    prisma.eventoTimeline.findMany({
      where: { tenantId: tid, empresaId: eid },
      select: { id: true, tipo: true, titulo: true, descripcion: true, creadoEn: true, contacto: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" }, take: 50,
    }),
  ]);

  type Item = { id: string; fecha: Date; categoria: string; titulo: string; subtitulo?: string; meta?: Record<string, unknown> };
  const items: Item[] = [
    ...actividades.map(a => ({ id: `act-${a.id}`, fecha: new Date(a.fecha), categoria: "ACTIVIDAD", titulo: a.titulo, subtitulo: a.tipo, meta: { completada: a.completada, notas: a.notas } })),
    ...oportunidades.map(o => ({ id: `opo-${o.id}`, fecha: o.creadoEn, categoria: "OPORTUNIDAD", titulo: o.titulo, subtitulo: o.etapa, meta: { valor: Number(o.valor ?? 0), oportunidadId: o.id } })),
    ...cotizaciones.map(c => ({ id: `cot-${c.id}`, fecha: c.creadoEn, categoria: "COTIZACION", titulo: `Cotización ${numeroCotizacion(c)}`, subtitulo: c.estado, meta: { cotizacionId: c.id } })),
    ...eventos.map(e => ({ id: `evt-${e.id}`, fecha: e.creadoEn, categoria: "EVENTO", titulo: e.titulo, subtitulo: e.tipo, meta: { descripcion: e.descripcion, contacto: e.contacto?.nombre, eventoId: e.id } })),
  ];

  items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: { empresaId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { tipo, titulo, descripcion, contactoId } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  const ev = await prisma.eventoTimeline.create({
    data: {
      tipo: tipo ?? "NOTA",
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      empresaId: params.empresaId,
      contactoId: contactoId || null,
      tenantId: session.user.tenantId,
    },
  });
  return NextResponse.json(ev, { status: 201 });
}

export async function DELETE(req: Request, _ctx: { params: { empresaId: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Sin eventoId hay que parar aquí: Prisma ignora los campos undefined, así
  // que el where se quedaría solo con tenantId y el deleteMany se llevaría por
  // delante TODA la línea de tiempo del cliente, devolviendo un 200 tranquilo.
  const cuerpo = await req.json().catch(() => ({}));
  const eventoId = typeof cuerpo?.eventoId === "string" ? cuerpo.eventoId.trim() : "";
  if (!eventoId) return NextResponse.json({ error: "Falta eventoId" }, { status: 400 });

  await prisma.eventoTimeline.deleteMany({ where: { id: eventoId, tenantId: session.user.tenantId } });
  return NextResponse.json({ ok: true });
}
