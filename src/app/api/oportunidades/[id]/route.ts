import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { titulo, valor, etapa, notas, empresaId, contactoId } = body;

  const oportunidad = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!oportunidad) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (titulo !== undefined) data.titulo = titulo.trim();
  if (valor !== undefined) data.valor = valor ? Number(valor) : null;
  if (etapa !== undefined) data.etapa = etapa;
  if (notas !== undefined) data.notas = notas?.trim() || null;
  if (empresaId !== undefined) data.empresaId = empresaId || null;
  if (contactoId !== undefined) data.contactoId = contactoId || null;

  const actualizada = await prisma.oportunidad.update({
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
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const existente = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.oportunidad.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
