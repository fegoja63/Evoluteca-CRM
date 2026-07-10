import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { crearActividadSchema } from "@/lib/validations/actividades";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: session.user.tenantId, ...filtroOwner(session.user.rol, session.user.id) },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true } },
      oportunidad: { select: { id: true, titulo: true } },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(actividades);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearActividadSchema, body);
  if (error) return error;
  const { tipo, titulo, fecha, notas, empresaId, contactoId, oportunidadId } = parsed;

  const actividad = await prisma.actividad.create({
    data: {
      tipo: tipo || "TAREA",
      titulo,
      fecha,
      notas: notas || null,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      oportunidadId: oportunidadId || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true } },
      oportunidad: { select: { id: true, titulo: true } },
    },
  });

  return NextResponse.json(actividad, { status: 201 });
}
