import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const metas = await prisma.metaVenta.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: [{ anio: "desc" }, { mes: "asc" }],
  });
  return NextResponse.json(metas);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { anio, mes, valorObjetivo } = await req.json();
  if (!anio || !valorObjetivo) return NextResponse.json({ error: "Año y valor requeridos" }, { status: 400 });
  const mesNum = mes ? Number(mes) : null;
  const meta = await prisma.metaVenta.upsert({
    where: { tenantId_anio_mes: { tenantId: session.user.tenantId, anio: Number(anio), mes: mesNum as number } },
    update: { valorObjetivo: Number(valorObjetivo) },
    create: { anio: Number(anio), mes: mesNum, valorObjetivo: Number(valorObjetivo), tenantId: session.user.tenantId },
  });
  return NextResponse.json(meta);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { anio, mes } = await req.json();
  await prisma.metaVenta.deleteMany({
    where: { tenantId: session.user.tenantId, anio: Number(anio), mes: mes ? Number(mes) : null },
  });
  return NextResponse.json({ ok: true });
}
