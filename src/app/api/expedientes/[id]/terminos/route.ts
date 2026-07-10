import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moduloActivo } from "@/lib/permisos";
import { crearTerminoSchema } from "@/lib/validations/expedientes";
import { parseOrError } from "@/lib/validations/helpers";

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
  const { data: parsed, error } = parseOrError(crearTerminoSchema, body);
  if (error) return error;
  const { descripcion, fechaLimite, notas } = parsed;

  const termino = await prisma.terminoExpediente.create({
    data: {
      descripcion: descripcion.trim(),
      fechaLimite,
      notas: notas?.trim() || null,
      expedienteId: params.id,
      tenantId: session.user.tenantId,
      creadoBy: session.user.id,
    },
  });

  return NextResponse.json(termino, { status: 201 });
}
