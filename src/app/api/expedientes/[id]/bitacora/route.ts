import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo, puedeEliminar } from "@/lib/permisos";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const eventos = await prisma.eventoExpediente.findMany({
    where: { tenantId: session.user.tenantId, expedienteId: params.id },
    orderBy: { creadoEn: "desc" },
    take: 100,
  });

  return NextResponse.json(eventos);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const expediente = await prisma.expediente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!expediente) return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });

  const { tipo, titulo, descripcion } = await req.json();
  if (!titulo?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  const evento = await prisma.eventoExpediente.create({
    data: {
      tipo: tipo ?? "NOTA",
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      expedienteId: params.id,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });
  return NextResponse.json(evento, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  // Sin eventoId, Prisma ignoraría ese campo y el deleteMany borraría la
  // bitácora entera del expediente devolviendo un 200 tranquilo.
  const cuerpo = await req.json().catch(() => ({}));
  const eventoId = typeof cuerpo?.eventoId === "string" ? cuerpo.eventoId.trim() : "";
  if (!eventoId) return NextResponse.json({ error: "Falta eventoId" }, { status: 400 });

  await prisma.eventoExpediente.deleteMany({
    where: { id: eventoId, tenantId: session.user.tenantId, expedienteId: params.id },
  });
  return NextResponse.json({ ok: true });
}
