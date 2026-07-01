import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const { titulo, fecha, sillasTotales, sillasVendidas, canal, ingresoEstimado, notas } = await request.json();

  const funcion = await prisma.funcion.update({
    where: { id: params.id },
    data: {
      titulo: titulo?.trim() || existente.titulo,
      fecha: fecha ? new Date(fecha) : existente.fecha,
      sillasTotales: sillasTotales != null ? Number(sillasTotales) : existente.sillasTotales,
      sillasVendidas: sillasVendidas != null ? Number(sillasVendidas) : existente.sillasVendidas,
      canal: canal || existente.canal,
      ingresoEstimado: ingresoEstimado != null ? Number(ingresoEstimado) : existente.ingresoEstimado,
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

  await prisma.funcion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
