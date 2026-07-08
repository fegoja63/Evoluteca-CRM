import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const salones = await prisma.salon.findMany({
    where: { tenantId: session.user.tenantId, activo: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(salones);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "salones")) {
    return NextResponse.json({ error: "El módulo Salones no está activo" }, { status: 403 });
  }

  const { nombre, capacidad, descripcion } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const salon = await prisma.salon.create({
    data: {
      nombre: nombre.trim(),
      capacidad: capacidad ? Number(capacidad) : null,
      descripcion: descripcion?.trim() || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(salon, { status: 201 });
}
