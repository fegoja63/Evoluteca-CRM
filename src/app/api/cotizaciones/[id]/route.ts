import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";
import { idsReemplazadas } from "@/lib/cotizaciones";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      empresa:  { select: { id: true, nombre: true, email: true, telefono: true } },
      contacto: { select: { id: true, nombre: true, email: true, telefono: true } },
      oportunidad: { select: { id: true, titulo: true } },
      items: { orderBy: { id: "asc" } },
      lineasAhorro: { orderBy: { id: "asc" } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Marca si esta cotización quedó reemplazada por una versión más reciente
  // del mismo negocio (recotización). Se deriva de las cotizaciones hermanas,
  // sin columna extra en la base.
  let reemplazada = false;
  if (cot.oportunidadId) {
    const hermanas = await prisma.cotizacion.findMany({
      where: { oportunidadId: cot.oportunidadId, tenantId: session.user.tenantId, eliminadoEn: null },
      select: { id: true, numero: true, estado: true },
    });
    reemplazada = idsReemplazadas(hermanas.map(h => ({ ...h, oportunidadId: cot.oportunidadId }))).has(cot.id);
  }

  return NextResponse.json({ ...cot, reemplazada });
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
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
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

  // Aceptar una cotización cierra el negocio: mueve su oportunidad a "Ganada"
  // en el pipeline (registrando el cambio de etapa), coherente con que la
  // cotización es la base del pipeline. Rechazar NO mueve el negocio, porque
  // suele recotizarse y el negocio sigue vivo.
  if (estado === "ACEPTADA") {
    const cot = await prisma.cotizacion.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { oportunidadId: true },
    });
    if (cot?.oportunidadId) {
      const op = await prisma.oportunidad.findFirst({
        where: { id: cot.oportunidadId, tenantId: session.user.tenantId, eliminadoEn: null },
        select: { id: true, etapa: true },
      });
      if (op && op.etapa !== "GANADA") {
        await prisma.$transaction([
          prisma.oportunidad.update({ where: { id: op.id }, data: { etapa: "GANADA" } }),
          prisma.cambioEtapa.create({
            data: {
              oportunidadId: op.id,
              etapaAnterior: op.etapa,
              etapaNueva: "GANADA",
              creadoBy: session.user.id ?? null,
              creadoByNombre: session.user.name ?? null,
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  // Borrado suave: se mueve a la Papelera en vez de eliminarse de inmediato
  // (igual que Empresa/Contacto/Oportunidad) — se puede restaurar desde ahí.
  await prisma.cotizacion.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    data: { eliminadoEn: new Date() },
  });

  return NextResponse.json({ ok: true });
}
