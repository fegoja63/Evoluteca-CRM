import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      empresa:  { select: { id: true, nombre: true, email: true, telefono: true } },
      contacto: { select: { id: true, nombre: true, email: true, telefono: true } },
      oportunidad: { select: { id: true, titulo: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(cot);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsedBody, error } = parseOrError(editarCotizacionSchema, body);
  if (error) return error;
  const { estado, notas, empresaId, motivoRechazo, fechaEvento, horaInicio, horaFin, impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje } = parsedBody;

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }

  await prisma.cotizacion.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(estado !== undefined && { estado }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(empresaId !== undefined && { empresaId: empresaId || null }),
      ...(motivoRechazo !== undefined && { motivoRechazo: motivoRechazo || null }),
      ...(fechaEvento !== undefined && { fechaEvento: fechaEvento ? new Date(fechaEvento) : null }),
      ...(horaInicio !== undefined && { horaInicio: horaInicio || null }),
      ...(horaFin !== undefined && { horaFin: horaFin || null }),
      ...(impuestoNombre !== undefined && { impuestoNombre: impuestoNombre?.trim() || null }),
      ...(impuestoPorcentaje !== undefined && { impuestoPorcentaje: impuestoPorcentaje ?? null }),
      ...(impuesto2Nombre !== undefined && { impuesto2Nombre: impuesto2Nombre?.trim() || null }),
      ...(impuesto2Porcentaje !== undefined && { impuesto2Porcentaje: impuesto2Porcentaje ?? null }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  // ItemCotizacion.cotizacion tiene onDelete: Cascade, así que borrar la
  // cotización (ya filtrada por tenantId) se lleva sus ítems automáticamente
  // — no hace falta (ni conviene) borrar los ítems por separado sin ese filtro.
  await prisma.cotizacion.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
