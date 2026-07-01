import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const productos = await prisma.producto.findMany({
    where: { tenantId: session.user.tenantId, activo: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(productos);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { nombre, descripcion, precioBase } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const p = await prisma.producto.create({
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null, precioBase: Number(precioBase) || 0, tenantId: session.user.tenantId },
  });
  return NextResponse.json(p, { status: 201 });
}
