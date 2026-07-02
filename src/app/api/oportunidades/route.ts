import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const oportunidades = await prisma.oportunidad.findMany({
    where: { tenantId: session.user.tenantId, ...filtroOwner(session.user.rol, session.user.id) },
    orderBy: { creadoEn: "desc" },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true, email: true } },
    },
  });

  return NextResponse.json(oportunidades);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { titulo, valor, etapa, notas, empresaId, contactoId } = body;

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const oportunidad = await prisma.oportunidad.create({
    data: {
      titulo: titulo.trim(),
      valor: valor ? Number(valor) : null,
      etapa: etapa || "PROSPECTO",
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(oportunidad, { status: 201 });
}
