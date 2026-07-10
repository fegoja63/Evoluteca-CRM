import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { creadoEn: "desc" },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true, email: true } },
      oportunidad: { select: { id: true, titulo: true, fechaEvento: true, sede: true } },
      items: true,
    },
  });

  return NextResponse.json(cotizaciones);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(crearCotizacionSchema, body);
  if (error) return error;
  const { empresaId, contactoId, oportunidadId, salonId, fechaEvento, horaInicio, horaFin, sede, notas, fechaValidez, items, impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje } = parsed;

  // Cada relación opcional debe pertenecer al mismo tenant — sin esto, un
  // usuario podría enlazar (y luego ver los datos de) una empresa/contacto/
  // oportunidad/salón de otro tenant simplemente enviando su id.
  const tenantId = session.user.tenantId;
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }
  if (oportunidadId) {
    const oportunidad = await prisma.oportunidad.findFirst({ where: { id: oportunidadId, tenantId } });
    if (!oportunidad) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 400 });
  }
  if (salonId) {
    const salon = await prisma.salon.findFirst({ where: { id: salonId, tenantId } });
    if (!salon) return NextResponse.json({ error: "Salón no encontrado" }, { status: 400 });
  }

  const cotizacion = await prisma.cotizacion.create({
    data: {
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      oportunidadId: oportunidadId || null,
      salonId: salonId || null,
      fechaEvento: fechaEvento ? new Date(fechaEvento) : null,
      horaInicio: horaInicio || null,
      horaFin: horaFin || null,
      sede: sede?.trim() || null,
      notas: notas?.trim() || null,
      fechaValidez: fechaValidez ? new Date(fechaValidez) : null,
      impuestoNombre: impuestoNombre?.trim() || null,
      impuestoPorcentaje: impuestoPorcentaje ?? null,
      impuesto2Nombre: impuesto2Nombre?.trim() || null,
      impuesto2Porcentaje: impuesto2Porcentaje ?? null,
      tenantId: session.user.tenantId,
      items: {
        create: items.map(item => ({
          descripcion: item.descripcion.trim(),
          cantidad: item.cantidad ?? 1,
          precioUnit: item.precioUnit,
        })),
      },
    },
    include: { empresa: true, contacto: true, items: true },
  });

  return NextResponse.json(cotizacion, { status: 201 });
}
