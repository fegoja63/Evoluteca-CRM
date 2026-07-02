import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — listar plantillas del tenant
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const plantillas = await prisma.plantillaCotizacion.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { creadoEn: "desc" },
    include: { items: { orderBy: { id: "asc" } } },
  });

  return NextResponse.json(plantillas);
}

// POST — crear plantilla
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { nombre, notas, items } = await req.json();
  if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const plantilla = await prisma.plantillaCotizacion.create({
    data: {
      nombre: nombre.trim(),
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
      items: {
        create: (items ?? []).map((it: { descripcion: string; cantidad: number; precioUnit: number }) => ({
          descripcion: it.descripcion,
          cantidad: it.cantidad ?? 1,
          precioUnit: it.precioUnit ?? 0,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(plantilla, { status: 201 });
}
