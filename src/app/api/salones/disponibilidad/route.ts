import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const salonId = searchParams.get("salonId");
  const fecha = searchParams.get("fecha");
  const excluir = searchParams.get("excluirCotizacionId");

  if (!salonId || !fecha) {
    return NextResponse.json({ aceptadas: [], pendientes: [] });
  }

  const inicioDia = new Date(`${fecha}T00:00:00.000Z`);
  if (isNaN(inicioDia.getTime())) {
    return NextResponse.json({ aceptadas: [], pendientes: [] });
  }
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      tenantId: session.user.tenantId,
      salonId,
      fechaEvento: { gte: inicioDia, lt: finDia },
      ...(excluir ? { id: { not: excluir } } : {}),
    },
    select: {
      id: true,
      estado: true,
      empresa: { select: { nombre: true } },
    },
  });

  const aceptadas = cotizaciones.filter(c => c.estado === "ACEPTADA");
  const pendientes = cotizaciones.filter(c => c.estado !== "ACEPTADA");

  return NextResponse.json({ aceptadas, pendientes });
}
