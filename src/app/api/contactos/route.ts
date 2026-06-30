import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const contactos = await prisma.contacto.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { creadoEn: "desc" },
    include: { empresa: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(contactos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, email, telefono, cargo, notas, empresaId } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const contacto = await prisma.contacto.create({
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      cargo: cargo?.trim() || null,
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(contacto, { status: 201 });
}
