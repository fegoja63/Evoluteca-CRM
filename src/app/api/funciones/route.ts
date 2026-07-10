import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearFuncionSchema } from "@/lib/validations/funciones";
import { parseOrError } from "@/lib/validations/helpers";

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
  const { data, error } = parseOrError(crearFuncionSchema, body);
  if (error) return error;
  const { titulo, fecha, sillasTotales, sillasVendidas, canal, ingresoEstimado, notas } = data;

  const funcion = await prisma.funcion.create({
    data: {
      titulo: titulo.trim(),
      fecha,
      sillasTotales: sillasTotales ?? 239,
      sillasVendidas: sillasVendidas ?? 0,
      canal: canal || "PLATAFORMA",
      ingresoEstimado: ingresoEstimado ?? null,
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(funcion, { status: 201 });
}
