import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearProductoSchema } from "@/lib/validations/productos";
import { parseOrError } from "@/lib/validations/helpers";

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
  const body = await req.json();
  const { data, error } = parseOrError(crearProductoSchema, body);
  if (error) return error;
  const { nombre, descripcion, precioBase } = data;
  const p = await prisma.producto.create({
    data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null, precioBase, tenantId: session.user.tenantId },
  });
  return NextResponse.json(p, { status: 201 });
}
