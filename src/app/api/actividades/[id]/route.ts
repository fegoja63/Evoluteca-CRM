import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarActividadSchema } from "@/lib/validations/actividades";
import { parseOrError } from "@/lib/validations/helpers";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarActividadSchema, body);
  if (error) return error;
  const { completada, titulo, tipo, fecha, notas, empresaId, contactoId, oportunidadId } = parsed;

  await prisma.actividad.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(completada !== undefined && { completada }),
      ...(titulo !== undefined && { titulo }),
      ...(tipo !== undefined && { tipo }),
      ...(fecha !== undefined && { fecha: fecha || undefined }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(empresaId !== undefined && { empresaId: empresaId || null }),
      ...(contactoId !== undefined && { contactoId: contactoId || null }),
      ...(oportunidadId !== undefined && { oportunidadId: oportunidadId || null }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.actividad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { creadoBy: true },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  // Cualquiera puede borrar su propia actividad (tarea/llamada del día a día);
  // borrar la de otro vendedor requiere ADMINISTRADOR o GERENTE.
  if (existente.creadoBy !== session.user.id && !puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  await prisma.actividad.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
