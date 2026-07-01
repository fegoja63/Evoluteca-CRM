import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { completada, titulo, tipo, fecha, notas, empresaId, contactoId, oportunidadId } = body;

  await prisma.actividad.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(completada !== undefined && { completada }),
      ...(titulo !== undefined && { titulo }),
      ...(tipo !== undefined && { tipo }),
      ...(fecha !== undefined && { fecha: new Date(fecha) }),
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

  await prisma.actividad.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
