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

  // Si un año no tiene meta anual manual (mes: null), se calcula sumando las
  // metas mensuales que sí estén configuradas para ese año. El usuario elige
  // el modo simplemente definiendo (o no) una meta anual manual: si la define,
  // esa tiene prioridad; si no, se calcula sola a partir de las mensuales.
  const aniosConManual = new Set(metas.filter(m => m.mes === null).map(m => m.anio));
  const mensualesPorAnio = new Map<number, typeof metas>();
  for (const m of metas) {
    if (m.mes === null) continue;
    if (!mensualesPorAnio.has(m.anio)) mensualesPorAnio.set(m.anio, []);
    mensualesPorAnio.get(m.anio)!.push(m);
  }

  const calculadas = Array.from(mensualesPorAnio.entries())
    .filter(([anio]) => !aniosConManual.has(anio))
    .map(([anio, mensuales]) => ({
      id: `calc-${anio}`,
      anio,
      mes: null,
      valorObjetivo: mensuales.reduce((acc, m) => acc + Number(m.valorObjetivo), 0).toString(),
      calculada: true,
      mesesConfigurados: mensuales.length,
    }));

  const resultado = [...metas, ...calculadas].sort((a, b) => b.anio - a.anio || (a.mes ?? 0) - (b.mes ?? 0));
  return NextResponse.json(resultado);
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
