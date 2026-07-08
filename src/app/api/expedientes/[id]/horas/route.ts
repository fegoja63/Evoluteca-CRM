import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const registros = await prisma.registroHoras.findMany({
    where: { tenantId: session.user.tenantId, expedienteId: params.id },
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(registros);
}

export async function POST(
  req: Request,
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

  const { fecha, horas, descripcion } = await req.json();
  if (!fecha) return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  if (!horas || isNaN(Number(horas)) || Number(horas) < 0.25) {
    return NextResponse.json({ error: "Las horas deben ser un número mayor o igual a 0.25" }, { status: 400 });
  }

  const registro = await prisma.registroHoras.create({
    data: {
      fecha: new Date(fecha),
      horas: Number(horas),
      descripcion: descripcion?.trim() || null,
      expedienteId: params.id,
      tenantId: session.user.tenantId,
      usuarioId: session.user.id,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
