import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";
import { idsReemplazadas, valorConImpuestos } from "@/lib/cotizaciones";
import { normalizarCuerpo, cuerpoEditable } from "@/lib/cuerpo-cotizacion";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      tenant: { select: { cuerpoCotizacion: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // Secciones efectivas de esta cotización (su cuerpo propio, o la plantilla del
  // tenant como respaldo). Sirve para poblar el editor del detalle sin exponer
  // el cuerpo crudo del tenant.
  const cuerpoEfectivo = cuerpoEditable(cot);
  const { tenant, ...cotSinTenant } = cot;
  void tenant;

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

  return NextResponse.json({ ...cotSinTenant, cuerpoEfectivo, reemplazada });
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsedBody, error } = parseOrError(editarCotizacionSchema, body);
  if (error) return error;
  const { estado, numeroManual, notas, condicionesComerciales, cuerpoCotizacion, empresaId, motivoRechazo, fechaEvento, horaInicio, horaFin, impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje, items } = parsedBody;

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }

  // Se lee una vez la cotización (debe pertenecer al tenant): su modalidad
  // decide si los impuestos aplican, y su oportunidad es la que hay que
  // mantener sincronizada en el pipeline.
  const cotActual = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    select: { id: true, modalidad: true, oportunidadId: true },
  });
  if (!cotActual) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  const esFijo = cotActual.modalidad === "FEE_FIJO";

  // Reemplazo de ítems (corregir producto/cantidad/precio tras crear). Se hace
  // en transacción y solo si la cotización pertenece al tenant.
  if (items !== undefined) {
    await prisma.$transaction([
      prisma.itemCotizacion.deleteMany({ where: { cotizacionId: params.id } }),
      prisma.itemCotizacion.createMany({
        data: items.map(it => ({
          cotizacionId: params.id,
          descripcion: it.descripcion,
          cantidad: it.cantidad ?? 1,
          precioUnit: it.precioUnit,
        })),
      }),
    ]);
  }

  await prisma.cotizacion.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    data: {
      ...(estado !== undefined && { estado }),
      ...(numeroManual !== undefined && { numeroManual: numeroManual?.trim() || null }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(condicionesComerciales !== undefined && { condicionesComerciales: condicionesComerciales || null }),
      ...(cuerpoCotizacion !== undefined && { cuerpoCotizacion: (() => { const c = normalizarCuerpo(cuerpoCotizacion); return c.length > 0 ? c : Prisma.DbNull; })() }),
      ...(empresaId !== undefined && { empresaId: empresaId || null }),
      ...(motivoRechazo !== undefined && { motivoRechazo: motivoRechazo || null }),
      ...(fechaEvento !== undefined && { fechaEvento: fechaEvento ? new Date(fechaEvento) : null }),
      ...(horaInicio !== undefined && { horaInicio: horaInicio || null }),
      ...(horaFin !== undefined && { horaFin: horaFin || null }),
      // Los impuestos solo se guardan en fee fijo; en las otras modalidades el
      // total es el honorario/fee sin IVA y guardar un impuesto dejaría un dato
      // que ninguna vista refleja (mismo criterio que en la creación).
      ...(impuestoNombre !== undefined && { impuestoNombre: esFijo ? (impuestoNombre?.trim() || null) : null }),
      ...(impuestoPorcentaje !== undefined && { impuestoPorcentaje: esFijo ? (impuestoPorcentaje ?? null) : null }),
      ...(impuesto2Nombre !== undefined && { impuesto2Nombre: esFijo ? (impuesto2Nombre?.trim() || null) : null }),
      ...(impuesto2Porcentaje !== undefined && { impuesto2Porcentaje: esFijo ? (impuesto2Porcentaje ?? null) : null }),
    },
  });

  // Al cambiar los ítems, el valor de la cotización cambia y hay que reflejarlo
  // en el negocio del pipeline: sin esto, corregir un precio dejaba el pipeline
  // y el forecast con el valor viejo. El valor del negocio es BRUTO (con IVA),
  // igual que al crear la cotización y que el total que ve el cliente.
  if (items !== undefined && cotActual.oportunidadId) {
    const fresca = await prisma.cotizacion.findUnique({
      where: { id: params.id },
      select: {
        modalidad: true, porcentajeHonorarios: true, horizonteMeses: true, feeMensual: true,
        impuestoPorcentaje: true, impuesto2Porcentaje: true,
        items: { select: { cantidad: true, precioUnit: true } },
        lineasAhorro: { select: { ahorroEstimadoMensual: true } },
      },
    });
    if (fresca) {
      const valor = valorConImpuestos({
        modalidad: fresca.modalidad,
        items: fresca.items.map(i => ({ cantidad: i.cantidad, precioUnit: Number(i.precioUnit) })),
        lineasAhorro: fresca.lineasAhorro.map(l => ({ gastoBaseMensual: 0, ahorroEstimadoMensual: Number(l.ahorroEstimadoMensual) })),
        porcentajeHonorarios: fresca.porcentajeHonorarios == null ? null : Number(fresca.porcentajeHonorarios),
        horizonteMeses: fresca.horizonteMeses,
        feeMensual: fresca.feeMensual == null ? null : Number(fresca.feeMensual),
        impuestoPorcentaje: fresca.impuestoPorcentaje == null ? null : Number(fresca.impuestoPorcentaje),
        impuesto2Porcentaje: fresca.impuesto2Porcentaje == null ? null : Number(fresca.impuesto2Porcentaje),
      });
      await prisma.oportunidad.updateMany({
        where: { id: cotActual.oportunidadId, tenantId: session.user.tenantId, eliminadoEn: null },
        data: { valor },
      });
    }
  }

  // Aceptar una cotización cierra el negocio: mueve su oportunidad a "Ganada"
  // en el pipeline (registrando el cambio de etapa), coherente con que la
  // cotización es la base del pipeline. Rechazar NO mueve el negocio, porque
  // suele recotizarse y el negocio sigue vivo.
  if (estado === "ACEPTADA") {
    if (cotActual.oportunidadId) {
      const op = await prisma.oportunidad.findFirst({
        where: { id: cotActual.oportunidadId, tenantId: session.user.tenantId, eliminadoEn: null },
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

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
