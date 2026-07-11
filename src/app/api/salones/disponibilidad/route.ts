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
  const horaInicioQ = searchParams.get("horaInicio");
  const horaFinQ = searchParams.get("horaFin");

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
      eliminadoEn: null,
      salonId,
      fechaEvento: { gte: inicioDia, lt: finDia },
      ...(excluir ? { id: { not: excluir } } : {}),
    },
    select: {
      id: true,
      estado: true,
      horaInicio: true,
      horaFin: true,
      empresa: { select: { nombre: true } },
    },
  });

  // Si quien consulta especifica un rango de horas, dos reservas del mismo
  // salón el mismo día ya no chocan si sus horarios no se solapan. Una
  // reserva sin hora (creada antes de este cambio, o explícitamente "todo
  // el día") siempre se considera en conflicto, igual que si quien consulta
  // tampoco especifica hora.
  const seSolapan = (c: { horaInicio: string | null; horaFin: string | null }) => {
    if (!horaInicioQ || !horaFinQ) return true;
    if (!c.horaInicio || !c.horaFin) return true;
    return c.horaInicio < horaFinQ && c.horaFin > horaInicioQ;
  };

  const relevantes = cotizaciones.filter(seSolapan);
  const aceptadas = relevantes.filter(c => c.estado === "ACEPTADA");
  const pendientes = relevantes.filter(c => c.estado !== "ACEPTADA");

  return NextResponse.json({ aceptadas, pendientes });
}
