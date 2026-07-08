import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // ?todas=1 omite el filtro "solo mis oportunidades" — lo usa el selector de
  // "Oportunidad vinculada" al crear una cotización, donde cualquier usuario
  // debe poder enlazar una oportunidad del negocio sin importar quién la creó.
  // El Pipeline (vista principal) sigue llamando sin este parámetro.
  const { searchParams } = new URL(request.url);
  const todas = searchParams.get("todas") === "1";

  const oportunidades = await prisma.oportunidad.findMany({
    where: { tenantId: session.user.tenantId, ...(todas ? {} : filtroOwner(session.user.rol, session.user.id)) },
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
  const { titulo, valor, etapa, notas, empresaId, contactoId, probabilidad, fechaCierre, salonId, sede, fechaEvento, horaInicio, horaFin } = body;

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
      salonId: salonId || null,
      sede: sede?.trim() || null,
      fechaEvento: fechaEvento ? new Date(fechaEvento) : null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(oportunidad, { status: 201 });
}
