import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const nps = await prisma.npsRespuesta.findMany({
    where: { funcionId: params.id },
    orderBy: { creadoEn: "desc" },
    include: { espectador: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(nps);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const funcion = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!funcion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await request.json();
  const { puntuacion, comentario, espectadorId } = body;

  if (!puntuacion || puntuacion < 1 || puntuacion > 10) {
    return NextResponse.json({ error: "Puntuación debe ser entre 1 y 10" }, { status: 400 });
  }

  const respuesta = await prisma.npsRespuesta.create({
    data: {
      puntuacion: Number(puntuacion),
      comentario: comentario?.trim() || null,
      funcionId: params.id,
      espectadorId: espectadorId || null,
    },
  });

  return NextResponse.json(respuesta, { status: 201 });
}
