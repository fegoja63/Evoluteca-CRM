import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const expediente = await prisma.expediente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!expediente) return NextResponse.json({ error: "Expediente no encontrado" }, { status: 404 });

  const body = await request.json();
  const { descripcion, fechaLimite, notas } = body;

  if (!descripcion?.trim()) {
    return NextResponse.json({ error: "La descripción es obligatoria" }, { status: 400 });
  }
  if (!fechaLimite) {
    return NextResponse.json({ error: "La fecha límite es obligatoria" }, { status: 400 });
  }

  const termino = await prisma.terminoExpediente.create({
    data: {
      descripcion: descripcion.trim(),
      fechaLimite: new Date(fechaLimite),
      notas: notas?.trim() || null,
      expedienteId: params.id,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(termino, { status: 201 });
}
