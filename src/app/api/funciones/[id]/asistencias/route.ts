import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const asistencias = await prisma.asistencia.findMany({
    where: { tenantId: session.user.tenantId, funcionId: params.id },
    orderBy: { creadoEn: "desc" },
    include: {
      espectador: { select: { id: true, nombre: true, telefono: true, segmento: true, _count: { select: { asistencias: true } } } },
    },
  });

  return NextResponse.json(asistencias);
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const funcion = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!funcion) return NextResponse.json({ error: "Función no encontrada" }, { status: 404 });

  const body = await req.json();
  let espectadorId: string | undefined = body.espectadorId;

  if (!espectadorId) {
    const { nombre, telefono, email } = body;
    if (!nombre?.trim()) {
      return NextResponse.json({ error: "Nombre requerido para crear un espectador nuevo" }, { status: 400 });
    }
    const nuevo = await prisma.espectador.create({
      data: {
        nombre: nombre.trim(),
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        tenantId: session.user.tenantId,
      },
    });
    espectadorId = nuevo.id;
  } else {
    const espectador = await prisma.espectador.findFirst({
      where: { id: espectadorId, tenantId: session.user.tenantId },
    });
    if (!espectador) return NextResponse.json({ error: "Espectador no encontrado" }, { status: 400 });
  }

  const existente = await prisma.asistencia.findFirst({
    where: { funcionId: params.id, espectadorId },
  });
  if (existente) {
    return NextResponse.json({ error: "Este espectador ya está registrado en esta función" }, { status: 400 });
  }

  const asistencia = await prisma.asistencia.create({
    data: {
      funcionId: params.id,
      espectadorId,
      tenantId: session.user.tenantId,
    },
    include: { espectador: { select: { id: true, nombre: true, telefono: true, segmento: true } } },
  });

  return NextResponse.json(asistencia, { status: 201 });
}
