import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const empresas = await prisma.empresa.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...filtroOwner(session.user.rol, session.user.id),
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { creadoEn: "desc" },
    include: { _count: { select: { contactos: true } } },
  });

  return NextResponse.json(empresas);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, email, sector, sitioWeb, telefono, notas } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const empresa = await prisma.empresa.create({
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      sector: sector?.trim() || null,
      sitioWeb: sitioWeb?.trim() || null,
      telefono: telefono?.trim() || null,
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(empresa, { status: 201 });
}
