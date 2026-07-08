import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const asistencias = await prisma.asistencia.findMany({
    where: {
      tenantId: session.user.tenantId,
      npsSolicitadoEn: null,
      espectador: { telefono: { not: null } },
      funcion: { fecha: { lte: hace24h } },
    },
    include: {
      espectador: { select: { id: true, nombre: true, telefono: true } },
      funcion: { select: { id: true, titulo: true, fecha: true } },
    },
    orderBy: { funcion: { fecha: "desc" } },
  });

  // Excluir a quien ya respondió la encuesta para esa función (evita pedirle
  // dos veces si ya la contestó por otro medio y alguien la registró manual).
  const pares = asistencias.map(a => ({ funcionId: a.funcionId, espectadorId: a.espectadorId }));
  const yaRespondieron = pares.length > 0
    ? await prisma.npsRespuesta.findMany({
        where: {
          OR: pares.map(p => ({ funcionId: p.funcionId, espectadorId: p.espectadorId })),
        },
        select: { funcionId: true, espectadorId: true },
      })
    : [];
  const respondidoSet = new Set(yaRespondieron.map(r => `${r.funcionId}:${r.espectadorId}`));

  const pendientes = asistencias.filter(a => !respondidoSet.has(`${a.funcionId}:${a.espectadorId}`));

  return NextResponse.json(pendientes);
}
