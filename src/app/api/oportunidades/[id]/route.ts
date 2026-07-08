import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const op = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      empresa:  { select: { id: true, nombre: true, sector: true, telefono: true } },
      contacto: { select: { id: true, nombre: true, email: true, telefono: true, cargo: true } },
      actividades: { orderBy: { fecha: "desc" }, take: 10 },
      cambiosEtapa: { orderBy: { creadoEn: "asc" } },
    },
  });

  if (!op) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(op);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { titulo, valor, etapa, notas, empresaId, contactoId, probabilidad, fechaCierre } = body;

  const oportunidad = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!oportunidad) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (valor !== undefined && valor !== null && valor !== "" && isNaN(Number(valor))) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }
  if (probabilidad !== undefined && (probabilidad === "" || isNaN(Number(probabilidad)))) {
    return NextResponse.json({ error: "Probabilidad inválida" }, { status: 400 });
  }
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId: session.user.tenantId } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (titulo !== undefined) data.titulo = titulo.trim();
  if (valor !== undefined) data.valor = valor ? Number(valor) : null;
  if (etapa !== undefined) data.etapa = etapa;
  if (notas !== undefined) data.notas = notas?.trim() || null;
  if (empresaId !== undefined) data.empresaId = empresaId || null;
  if (contactoId !== undefined) data.contactoId = contactoId || null;
  if (probabilidad !== undefined) data.probabilidad = Number(probabilidad);
  if (fechaCierre !== undefined) data.fechaCierre = fechaCierre ? new Date(fechaCierre) : null;

  const cambioDeEtapa = etapa !== undefined && etapa !== oportunidad.etapa;

  // Actualizar la oportunidad y registrar el cambio de etapa (si aplica) de forma
  // atomica: si el registro de auditoria falla, el cambio de etapa tampoco queda.
  const [actualizada] = await prisma.$transaction([
    prisma.oportunidad.update({ where: { id: params.id }, data }),
    ...(cambioDeEtapa ? [
      prisma.cambioEtapa.create({
        data: {
          oportunidadId: params.id,
          etapaAnterior: oportunidad.etapa,
          etapaNueva: etapa,
          creadoBy: session.user.id ?? null,
          creadoByNombre: session.user.name ?? null,
        },
      }),
    ] : []),
  ]);

  return NextResponse.json(actualizada);
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

  const existente = await prisma.oportunidad.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.oportunidad.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
