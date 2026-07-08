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
  const { titulo, valor, etapa, notas, empresaId, contactoId, probabilidad, fechaCierre } = body;

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }

  const oportunidad = await prisma.oportunidad.create({
    data: {
      titulo: titulo.trim(),
      valor: valor ? Number(valor) : null,
      etapa: etapa || "PROSPECTO",
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      probabilidad: probabilidad !== undefined ? Number(probabilidad) : 50,
      fechaCierre: fechaCierre ? new Date(fechaCierre) : null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(oportunidad, { status: 201 });
}
