import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwnerActividad } from "@/lib/permisos";
import { crearActividadSchema } from "@/lib/validations/actividades";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: session.user.tenantId, ...filtroOwnerActividad(session.user.rol, session.user.id) },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true } },
      oportunidad: { select: { id: true, titulo: true } },
      responsable: { select: { id: true, nombre: true } },
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
  const { tipo, titulo, fecha, notas, estado, responsableId, empresaId, contactoId, oportunidadId } = parsed;

  // Si no se indica responsable, la tarea queda a cargo de quien la crea.
  const responsableFinal = responsableId || session.user.id;
  // `estado` y `completada` se mantienen sincronizados (ver enum EstadoActividad).
  const estadoFinal = estado || "PENDIENTE";

  // El responsable debe pertenecer al mismo tenant (evita asignar a un usuario
  // de otra organización pasando un id arbitrario).
  if (responsableId) {
    const valido = await prisma.usuario.findFirst({
      where: { id: responsableId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!valido) return NextResponse.json({ error: "Responsable inválido" }, { status: 400 });
  }

  const actividad = await prisma.actividad.create({
    data: {
      tipo: tipo || "TAREA",
      titulo,
      fecha,
      notas: notas || null,
      estado: estadoFinal,
      completada: estadoFinal === "COMPLETADA",
      responsableId: responsableFinal,
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
      responsable: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json(actividad, { status: 201 });
}
