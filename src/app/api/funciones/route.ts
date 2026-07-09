import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const take = Number(searchParams.get("take") ?? 30) || 30;
  const where = { tenantId: session.user.tenantId };

  if (!page) {
    const funciones = await prisma.funcion.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: { _count: { select: { npsList: true } } },
    });
    return NextResponse.json(funciones);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const [funciones, total] = await Promise.all([
    prisma.funcion.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: { _count: { select: { npsList: true } } },
      skip: (pageNum - 1) * take,
      take,
    }),
    prisma.funcion.count({ where }),
  ]);

  return NextResponse.json(funciones, { headers: { "X-Total-Count": String(total) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { titulo, fecha, sillasTotales, sillasVendidas, canal, ingresoEstimado, notas } = body;

  if (!titulo?.trim() || !fecha) {
    return NextResponse.json({ error: "Título y fecha son obligatorios" }, { status: 400 });
  }

  const funcion = await prisma.funcion.create({
    data: {
      titulo: titulo.trim(),
      fecha: new Date(fecha),
      sillasTotales: Number(sillasTotales) || 239,
      sillasVendidas: Number(sillasVendidas) || 0,
      canal: canal || "PLATAFORMA",
      ingresoEstimado: ingresoEstimado ? Number(ingresoEstimado) : null,
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(funcion, { status: 201 });
}
