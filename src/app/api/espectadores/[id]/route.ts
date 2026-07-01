import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const { nombre, email, telefono, segmento, notas } = await request.json();

  const espectador = await prisma.espectador.update({
    where: { id: params.id },
    data: {
      nombre: nombre?.trim() || existente.nombre,
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      segmento: segmento || existente.segmento,
      notas: notas?.trim() || null,
    },
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

  await prisma.espectador.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
