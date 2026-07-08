import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  if (body.capacidad !== undefined && body.capacidad !== null && isNaN(Number(body.capacidad))) {
    return NextResponse.json({ error: "Capacidad inválida" }, { status: 400 });
  }
  await prisma.salon.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
      ...(body.capacidad !== undefined && { capacidad: body.capacidad === null ? null : Number(body.capacidad) }),
      ...(body.activo !== undefined && { activo: body.activo }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }
  await prisma.salon.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { activo: false },
  });
  return NextResponse.json({ ok: true });
}
