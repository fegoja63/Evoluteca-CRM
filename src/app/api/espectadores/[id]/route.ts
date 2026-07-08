import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const espectador = await prisma.espectador.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      npsList: {
        orderBy: { creadoEn: "desc" },
        include: { funcion: { select: { id: true, titulo: true, fecha: true } } },
      },
      asistencias: {
        orderBy: { creadoEn: "desc" },
        include: { funcion: { select: { id: true, titulo: true, fecha: true } } },
      },
    },
  });

  if (!espectador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(espectador);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.espectador.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { nombre, email, telefono, segmento, nivelMembresia, notas } = await request.json();

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) data.nombre = nombre.trim() || existente.nombre;
  if (email !== undefined) data.email = email?.trim() || null;
  if (telefono !== undefined) data.telefono = telefono?.trim() || null;
  if (segmento !== undefined) data.segmento = segmento || existente.segmento;
  if (nivelMembresia !== undefined) data.nivelMembresia = nivelMembresia || null;
  if (notas !== undefined) data.notas = notas?.trim() || null;

  const espectador = await prisma.espectador.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(espectador);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.espectador.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  await prisma.espectador.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
