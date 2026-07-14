import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { accionCotizacionPublicaSchema } from "@/lib/validations/publica";
import { parseOrError } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: params.token, eliminadoEn: null },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
      items:    { orderBy: { id: "asc" } },
      lineasAhorro: { orderBy: { id: "asc" } },
      tenant:   { select: { nombre: true, logoUrl: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(cot);
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
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
