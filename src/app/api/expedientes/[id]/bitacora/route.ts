import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const { eventoId } = await req.json();
  await prisma.eventoExpediente.deleteMany({
    where: { id: eventoId, tenantId: session.user.tenantId, expedienteId: params.id },
  });
  return NextResponse.json({ ok: true });
}
