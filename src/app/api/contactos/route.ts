import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const tenantId = session.user.tenantId;

  const contactos = await prisma.contacto.findMany({
    where: {
      tenantId,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { empresa: { select: { id: true, nombre: true } } },
    orderBy: { creadoEn: "desc" },
  });

  return NextResponse.json(contactos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, email, telefono, cargo, notas, empresaId } = body;

  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const contacto = await prisma.contacto.create({
    data: {
      nombre,
      email: email || null,
      telefono: telefono || null,
      cargo: cargo || null,
      notas: notas || null,
      empresaId: empresaId || null,
      tenantId: session.user.tenantId,
    },
    include: { empresa: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(contacto, { status: 201 });
}
