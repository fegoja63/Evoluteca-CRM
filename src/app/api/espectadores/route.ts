import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearEspectadorSchema } from "@/lib/validations/espectadores";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const espectadores = await prisma.espectador.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { creadoEn: "desc" },
    include: {
      _count: { select: { npsList: true } },
      asistencias: { select: { funcion: { select: { fecha: true } } } },
    },
  });

  return NextResponse.json(espectadores);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearEspectadorSchema, body);
  if (error) return error;
  const { nombre, email, telefono, segmento, notas } = parsed;

  const espectador = await prisma.espectador.create({
    data: {
      nombre: nombre.trim(),
      email: email?.trim() || null,
      telefono: telefono?.trim() || null,
      segmento: segmento || "INDIVIDUAL",
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(espectador, { status: 201 });
}
