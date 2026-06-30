import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { fecha: "asc" },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true } },
      oportunidad: { select: { id: true, titulo: true } },
    },
  });

  return NextResponse.json(actividades);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { tipo, titulo, fecha, notas, empresaId, contactoId, oportunidadId } = body;

  if (!titulo?.trim() || !fecha) {
    return NextResponse.json({ error: "Título y fecha son obligatorios" }, { status: 400 });
  }

  const actividad = await prisma.actividad.create({
    data: {
      tipo: tipo || "TAREA",
      titulo: titulo.trim(),
      fecha: new Date(fecha),
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      oportunidadId: oportunidadId || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(actividad, { status: 201 });
}
