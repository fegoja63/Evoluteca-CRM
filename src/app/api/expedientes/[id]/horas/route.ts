import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";
import { registrarHorasSchema } from "@/lib/validations/expedientes";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const registros = await prisma.registroHoras.findMany({
    where: { tenantId: session.user.tenantId, expedienteId: params.id },
    orderBy: { fecha: "desc" },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(registros);
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

  const body = await req.json();
  const { data: parsed, error } = parseOrError(registrarHorasSchema, body);
  if (error) return error;
  const { fecha, horas, descripcion } = parsed;

  const registro = await prisma.registroHoras.create({
    data: {
      fecha,
      horas,
      descripcion: descripcion?.trim() || null,
      expedienteId: params.id,
      tenantId: session.user.tenantId,
      usuarioId: session.user.id,
    },
  });

  return NextResponse.json(registro, { status: 201 });
}
