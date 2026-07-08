import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar, moduloActivo } from "@/lib/permisos";

export async function PATCH(
  request: Request,
  { params }: { params: { terminoId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const existente = await prisma.terminoExpediente.findFirst({
    where: { id: params.terminoId, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const { estado, descripcion, fechaLimite, notas } = body;

  const data: Record<string, unknown> = {};
  if (estado !== undefined) data.estado = estado;
  if (descripcion !== undefined) data.descripcion = descripcion.trim();
  if (fechaLimite !== undefined) data.fechaLimite = new Date(fechaLimite);
  if (notas !== undefined) data.notas = notas?.trim() || null;

  const actualizado = await prisma.terminoExpediente.update({ where: { id: params.terminoId }, data });
  return NextResponse.json(actualizado);
}

export async function DELETE(
  request: Request,
  { params }: { params: { terminoId: string } }
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

  const existente = await prisma.terminoExpediente.findFirst({
    where: { id: params.terminoId, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.terminoExpediente.delete({ where: { id: params.terminoId } });
  return NextResponse.json({ ok: true });
}
