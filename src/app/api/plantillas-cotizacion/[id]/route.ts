import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

// DELETE — eliminar plantilla
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const plantilla = await prisma.plantillaCotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!plantilla) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.plantillaCotizacion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// PATCH — renombrar plantilla
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const existente = await prisma.plantillaCotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const plantilla = await prisma.plantillaCotizacion.update({
    where: { id: params.id },
    data: { nombre: nombre.trim() },
    include: { items: true },
  });

  return NextResponse.json(plantilla);
}
