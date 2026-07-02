import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rol, tenantId } = session.user;
  if (rol !== "ADMINISTRADOR" && rol !== "GERENTE") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const anio = parseInt(searchParams.get("anio") ?? String(new Date().getFullYear()));
  const mes  = parseInt(searchParams.get("mes")  ?? String(new Date().getMonth() + 1));

  const metas = await prisma.metaVendedor.findMany({
    where: { tenantId, anio, mes },
    select: { userId: true, meta: true },
  });

  return NextResponse.json(metas);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { rol, tenantId } = session.user;
  if (rol !== "ADMINISTRADOR" && rol !== "GERENTE") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { userId, anio, mes, meta } = await req.json();
  if (!userId || !anio || !mes || meta === undefined) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const result = await prisma.metaVendedor.upsert({
    where: { tenantId_userId_anio_mes: { tenantId, userId, anio, mes } },
    update: { meta },
    create: { tenantId, userId, anio, mes, meta },
  });

  return NextResponse.json(result);
}
