import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarFuncionSchema } from "@/lib/validations/funciones";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const funcion = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      npsList: {
        orderBy: { creadoEn: "desc" },
        include: { espectador: { select: { id: true, nombre: true } } },
      },
      asistencias: {
        orderBy: { creadoEn: "desc" },
        include: { espectador: { select: { id: true, nombre: true, telefono: true, segmento: true, _count: { select: { asistencias: true } } } } },
      },
    },
  });

  if (!funcion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(funcion);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarFuncionSchema, body);
  if (error) return error;
  const { titulo, fecha, sillasTotales, sillasVendidas, canal, ingresoEstimado, notas } = parsed;

  const funcion = await prisma.funcion.update({
    where: { id: params.id },
    data: {
      titulo: titulo?.trim() || existente.titulo,
      fecha: fecha ?? existente.fecha,
      sillasTotales: sillasTotales ?? existente.sillasTotales,
      sillasVendidas: sillasVendidas ?? existente.sillasVendidas,
      canal: canal || existente.canal,
      ingresoEstimado: ingresoEstimado ?? existente.ingresoEstimado,
      notas: notas?.trim() || null,
    },
  });

  return NextResponse.json(funcion);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  await prisma.funcion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
