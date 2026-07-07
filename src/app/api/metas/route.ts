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

  // Prisma no permite usar el índice único compuesto tenantId_anio_mes cuando
  // mes es null (las metas anuales), así que para ese caso hacemos find + create/update a mano.
  let meta;
  if (mesNum === null) {
    const existente = await prisma.metaVenta.findFirst({
      where: { tenantId: session.user.tenantId, anio: Number(anio), mes: null },
    });
    meta = existente
      ? await prisma.metaVenta.update({ where: { id: existente.id }, data: { valorObjetivo: Number(valorObjetivo) } })
      : await prisma.metaVenta.create({ data: { anio: Number(anio), mes: null, valorObjetivo: Number(valorObjetivo), tenantId: session.user.tenantId } });
  } else {
    meta = await prisma.metaVenta.upsert({
      where: { tenantId_anio_mes: { tenantId: session.user.tenantId, anio: Number(anio), mes: mesNum } },
      update: { valorObjetivo: Number(valorObjetivo) },
      create: { anio: Number(anio), mes: mesNum, valorObjetivo: Number(valorObjetivo), tenantId: session.user.tenantId },
    });
  }
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
