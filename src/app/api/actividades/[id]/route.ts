import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { tipo, titulo, fecha, completada, notas, empresaId, contactoId, oportunidadId } = body;

  const actividad = await prisma.actividad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!actividad) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (tipo !== undefined) data.tipo = tipo;
  if (titulo !== undefined) data.titulo = titulo.trim();
  if (fecha !== undefined) data.fecha = new Date(fecha);
  if (completada !== undefined) data.completada = completada;
  if (notas !== undefined) data.notas = notas?.trim() || null;
  if (empresaId !== undefined) data.empresaId = empresaId || null;
  if (contactoId !== undefined) data.contactoId = contactoId || null;
  if (oportunidadId !== undefined) data.oportunidadId = oportunidadId || null;

  const actualizada = await prisma.actividad.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(actualizada);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.actividad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.actividad.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
