import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { crearOportunidadSchema } from "@/lib/validations/oportunidades";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // ?todas=1 omite el filtro "solo mis oportunidades" — lo usa el selector de
  // "Oportunidad vinculada" al crear una cotización, donde cualquier usuario
  // debe poder enlazar una oportunidad del negocio sin importar quién la creó.
  // El Pipeline (vista principal) sigue llamando sin este parámetro.
  const { searchParams } = new URL(request.url);
  const todas = searchParams.get("todas") === "1";
  const page = searchParams.get("page");
  const take = Number(searchParams.get("take") ?? 30) || 30;

  const where = { tenantId: session.user.tenantId, eliminadoEn: null, ...(todas ? {} : filtroOwner(session.user.rol, session.user.id)) };

  // Sin "page" se mantiene el comportamiento anterior (lista completa) — el
  // Kanban de Pipeline y los KPIs de Cotizaciones necesitan el dataset
  // entero para agrupar por etapa y calcular totales correctamente.
  if (!page) {
    const oportunidades = await prisma.oportunidad.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        empresa: { select: { id: true, nombre: true } },
        contacto: { select: { id: true, nombre: true, email: true } },
      },
    });
    return NextResponse.json(oportunidades);
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const [oportunidades, total] = await Promise.all([
    prisma.oportunidad.findMany({
      where,
      orderBy: { creadoEn: "desc" },
      include: {
        empresa: { select: { id: true, nombre: true } },
        contacto: { select: { id: true, nombre: true, email: true } },
      },
      skip: (pageNum - 1) * take,
      take,
    }),
    prisma.oportunidad.count({ where }),
  ]);

  return NextResponse.json(oportunidades, { headers: { "X-Total-Count": String(total) } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearOportunidadSchema, body);
  if (error) return error;
  const { titulo, valor, etapa, notas, empresaId, contactoId, probabilidad, fechaCierre, salonId, sede, fechaEvento, horaInicio, horaFin } = parsed;

  const tenantId = session.user.tenantId;
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }

  const oportunidad = await prisma.oportunidad.create({
    data: {
      titulo: titulo.trim(),
      valor: valor ?? null,
      etapa: etapa || "PROSPECTO",
      notas: notas?.trim() || null,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      probabilidad: probabilidad ?? 50,
      fechaCierre: fechaCierre || null,
      salonId: salonId || null,
      sede: sede?.trim() || null,
      fechaEvento: fechaEvento || null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(oportunidad, { status: 201 });
}
