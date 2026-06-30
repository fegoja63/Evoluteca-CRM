import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const contacto = await prisma.contacto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      empresa: { select: { id: true, nombre: true } },
      oportunidades: true,
      actividades: { orderBy: { fecha: "asc" } },
    },
  });

  if (!contacto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(contacto);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.contacto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const { nombre, email, telefono, cargo, notas, empresaId } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const contacto = await prisma.contacto.update({
    where: { id: params.id },
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      cargo: cargo?.trim() || null,
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
    },
  });

  return NextResponse.json(contacto);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.contacto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.contacto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
