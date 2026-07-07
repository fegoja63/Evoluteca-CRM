import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar, moduloActivo } from "@/lib/permisos";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const expediente = await prisma.expediente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      empresa: { select: { id: true, nombre: true, telefono: true, email: true } },
      terminos: { orderBy: { fechaLimite: "asc" } },
      bitacora: { orderBy: { creadoEn: "desc" } },
      registrosHoras: { orderBy: { fecha: "desc" }, include: { usuario: { select: { id: true, nombre: true } } } },
    },
  });

  if (!expediente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(expediente);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const existente = await prisma.expediente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const { numeroRadicado, juzgado, tipoProceso, contraparte, estado, notas, empresaId } = body;

  const data: Record<string, unknown> = {};
  if (numeroRadicado !== undefined) data.numeroRadicado = numeroRadicado.trim();
  if (juzgado !== undefined) data.juzgado = juzgado?.trim() || null;
  if (tipoProceso !== undefined) data.tipoProceso = tipoProceso?.trim() || null;
  if (contraparte !== undefined) data.contraparte = contraparte.trim();
  if (estado !== undefined) data.estado = estado;
  if (notas !== undefined) data.notas = notas?.trim() || null;
  if (empresaId !== undefined) data.empresaId = empresaId || null;

  const actualizado = await prisma.expediente.update({ where: { id: params.id }, data });
  return NextResponse.json(actualizado);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const existente = await prisma.expediente.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.expediente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
