import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: params.token },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
      items:    { orderBy: { id: "asc" } },
      tenant:   { select: { nombre: true, logoUrl: true } },
    },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(cot);
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  const cot = await prisma.cotizacion.findFirst({
    where: { tokenPublico: params.token },
    select: { id: true, estado: true },
  });
  if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!["ENVIADA", "BORRADOR"].includes(cot.estado)) {
    return NextResponse.json({ error: "No se puede cambiar el estado" }, { status: 400 });
  }

  const { accion, motivoRechazo } = await req.json();
  if (accion !== "ACEPTADA" && accion !== "RECHAZADA") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  await prisma.cotizacion.update({
    where: { id: cot.id },
    data: {
      estado: accion,
      ...(accion === "RECHAZADA" && motivoRechazo ? { motivoRechazo } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
