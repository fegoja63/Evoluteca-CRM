import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { accionCotizacionPublicaSchema } from "@/lib/validations/publica";
import { parseOrError } from "@/lib/validations/helpers";
import { seccionesVisibles } from "@/lib/cuerpo-cotizacion";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: params.token, eliminadoEn: null },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
      items:    { orderBy: { id: "asc" } },
      lineasAhorro: { orderBy: { id: "asc" } },
      tenant:   { select: { nombre: true, logoUrl: true, cuerpoCotizacion: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  // Se resuelven las secciones a mostrar en el servidor (cuerpo del tenant o las
  // condiciones por defecto) y se quita el campo crudo del tenant de la
  // respuesta pública.
  const { cuerpoCotizacion, ...tenant } = cot.tenant;
  void cuerpoCotizacion;
  return NextResponse.json({ ...cot, tenant, cuerpo: seccionesVisibles(cot.tenant.cuerpoCotizacion, !!cot.condicionesComerciales) });
}

export async function PATCH(req: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  // El token ya es la protección principal (alta entropía), pero se limita
  // por token para frenar abuso automatizado del enlace público.
  const permitido = await permitirYRegistrar(`cotpublica:${params.token}`, 10, 60 * 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });

  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: params.token, eliminadoEn: null },
    select: { id: true, estado: true },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!["ENVIADA", "BORRADOR"].includes(cot.estado)) {
    return NextResponse.json({ error: "No se puede cambiar el estado" }, { status: 400 });
  }

  const body = await req.json();
  const { data, error } = parseOrError(accionCotizacionPublicaSchema, body);
  if (error) return error;
  const { accion, motivoRechazo } = data;

  await prisma.cotizacion.update({
    where: { id: cot.id },
    data: {
      estado: accion,
      ...(accion === "RECHAZADA" && motivoRechazo ? { motivoRechazo } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
