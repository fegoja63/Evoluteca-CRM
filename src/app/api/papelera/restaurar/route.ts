import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { restaurarSchema } from "@/lib/validations/papelera";
import { parseOrError } from "@/lib/validations/helpers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para restaurar" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = parseOrError(restaurarSchema, body);
  if (error) return error;
  const { tipo, id } = data;

  const tenantId = session.user.tenantId;
  const where = { id, tenantId, eliminadoEn: { not: null } };

  if (tipo === "empresa") {
    const existente = await prisma.empresa.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.empresa.update({ where: { id }, data: { eliminadoEn: null } });
  } else if (tipo === "contacto") {
    const existente = await prisma.contacto.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.contacto.update({ where: { id }, data: { eliminadoEn: null } });
  } else if (tipo === "oportunidad") {
    const existente = await prisma.oportunidad.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.oportunidad.update({ where: { id }, data: { eliminadoEn: null } });
  } else {
    const existente = await prisma.cotizacion.findFirst({ where });
    if (!existente) return NextResponse.json({ error: "No encontrado en la papelera" }, { status: 404 });
    await prisma.cotizacion.update({ where: { id }, data: { eliminadoEn: null } });
  }

  return NextResponse.json({ ok: true });
}
