import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearCotizacionSchema } from "@/lib/validations/cotizaciones";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { tenantId: session.user.tenantId, eliminadoEn: null },
    orderBy: { creadoEn: "desc" },
    include: {
      empresa: { select: { id: true, nombre: true } },
      contacto: { select: { id: true, nombre: true, email: true } },
      oportunidad: { select: { id: true, titulo: true, fechaEvento: true, sede: true } },
      items: true,
      lineasAhorro: true,
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
  const { empresaId, contactoId, oportunidadId, salonId, numeroManual, fechaEvento, horaInicio, horaFin, sede, notas, fechaValidez, items, impuestoNombre, impuestoPorcentaje, impuesto2Nombre, impuesto2Porcentaje, modalidad, lineasAhorro, porcentajeHonorarios, horizonteMeses, feeMensual } = parsed;

  // Cada relación opcional debe pertenecer al mismo tenant — sin esto, un
  // usuario podría enlazar (y luego ver los datos de) una empresa/contacto/
  // oportunidad/salón de otro tenant simplemente enviando su id.
  const tenantId = session.user.tenantId;
  let empresaNombre: string | null = null;
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
    empresaNombre = empresa.nombre;
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }
  if (oportunidadId) {
    const oportunidad = await prisma.oportunidad.findFirst({ where: { id: oportunidadId, tenantId, eliminadoEn: null } });
    if (!oportunidad) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 400 });
  }
  if (salonId) {
    const salon = await prisma.salon.findFirst({ where: { id: salonId, tenantId } });
    if (!salon) return NextResponse.json({ error: "Salón no encontrado" }, { status: 400 });
  }

  const fechaEventoDate = fechaEvento ? new Date(fechaEvento) : null;

  // La cotización es la base del pipeline: si no se enlazó a una oportunidad
  // existente, se crea una automáticamente en la etapa "Cotización" (PROPUESTA)
  // con el cliente, salón, fecha y valor de la cotización, y se enlazan. Así
  // toda cotización aparece como un negocio en el Pipeline sin trabajo manual.
  // Ambas creaciones van en una transacción para no dejar una oportunidad
  // huérfana si la cotización falla.
  const cotizacion = await prisma.$transaction(async (tx) => {
    let opId = oportunidadId || null;
    if (!opId) {
      // Valor del negocio según la modalidad: en success fee es el honorario
      // estimado (Σ ahorro mensual × % × meses); en fee fijo, la suma de ítems.
      const valorNegocio =
        modalidad === "SUCCESS_FEE"
          ? lineasAhorro.reduce((s, l) => s + l.ahorroEstimadoMensual, 0) * ((porcentajeHonorarios ?? 0) / 100) * (horizonteMeses ?? 0)
          : modalidad === "FEE_MENSUAL"
            ? (feeMensual ?? 0) * (horizonteMeses ?? 0)
            : items.reduce((s, it) => s + (it.cantidad ?? 1) * it.precioUnit, 0);
      const op = await tx.oportunidad.create({
        data: {
          titulo: empresaNombre ? `Cotización — ${empresaNombre}` : "Cotización nueva",
          valor: valorNegocio,
          etapa: "PROPUESTA",
          empresaId: empresaId || null,
          contactoId: contactoId || null,
          salonId: salonId || null,
          sede: sede?.trim() || null,
          fechaEvento: fechaEventoDate,
          horaInicio: horaInicio || null,
          horaFin: horaFin || null,
          probabilidad: 50,
          tenantId,
          creadoBy: session.user.id,
        },
      });
      opId = op.id;
    }

    return tx.cotizacion.create({
      data: {
        empresaId: empresaId || null,
        contactoId: contactoId || null,
        oportunidadId: opId,
        salonId: salonId || null,
        numeroManual: numeroManual?.trim() || null,
        fechaEvento: fechaEventoDate,
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        sede: sede?.trim() || null,
        notas: notas?.trim() || null,
        fechaValidez: fechaValidez ? new Date(fechaValidez) : null,
        impuestoNombre: impuestoNombre?.trim() || null,
        impuestoPorcentaje: impuestoPorcentaje ?? null,
        impuesto2Nombre: impuesto2Nombre?.trim() || null,
        impuesto2Porcentaje: impuesto2Porcentaje ?? null,
        modalidad,
        porcentajeHonorarios: modalidad === "SUCCESS_FEE" ? (porcentajeHonorarios ?? null) : null,
        horizonteMeses: (modalidad === "SUCCESS_FEE" || modalidad === "FEE_MENSUAL") ? (horizonteMeses ?? null) : null,
        feeMensual: modalidad === "FEE_MENSUAL" ? (feeMensual ?? null) : null,
        tenantId,
        items: {
          create: items.map(item => ({
            descripcion: item.descripcion.trim(),
            cantidad: item.cantidad ?? 1,
            precioUnit: item.precioUnit,
          })),
        },
        lineasAhorro: {
          create: lineasAhorro.map(l => ({
            area: l.area.trim(),
            gastoBaseMensual: l.gastoBaseMensual,
            ahorroEstimadoMensual: l.ahorroEstimadoMensual,
          })),
        },
      },
      include: { empresa: true, contacto: true, items: true, lineasAhorro: true },
    });
  });

  return NextResponse.json(cotizacion, { status: 201 });
}
