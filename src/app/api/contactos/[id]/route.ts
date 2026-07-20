import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { operacionAuditoria } from "@/lib/auditoria";
import { editarContactoSchema } from "@/lib/validations/contactos";
import { parseOrError } from "@/lib/validations/helpers";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const contacto = await prisma.contacto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      empresa: { select: { id: true, nombre: true } },
      oportunidades: { where: { eliminadoEn: null }, select: { id: true, titulo: true, etapa: true, valor: true, motivoPerdida: true } },
      actividades: { select: { id: true, tipo: true, titulo: true, fecha: true, completada: true }, orderBy: { fecha: "desc" } },
    },
  });

  if (!contacto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(contacto);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data: parsed, error } = parseOrError(editarContactoSchema, body);
  if (error) return error;
  const { nombre, email, telefono, cargo, notas, empresaId } = parsed;

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId: session.user.tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 400 });
  }

  const contacto = await prisma.contacto.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(email !== undefined && { email: email || null }),
      ...(telefono !== undefined && { telefono: telefono || null }),
      ...(cargo !== undefined && { cargo: cargo || null }),
      ...(notas !== undefined && { notas: notas || null }),
      ...(empresaId !== undefined && { empresaId: empresaId || null }),
    },
  });

  return NextResponse.json(contacto);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  // Se lee antes de borrar para poder dejar en la auditoría qué se borró y de
  // paso responder 404 cuando no existe, en vez de un 200 silencioso.
  const existente = await prisma.contacto.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Borrado suave: el registro se guarda en la papelera y se puede restaurar.
  await prisma.$transaction([
    prisma.contacto.updateMany({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { eliminadoEn: new Date() },
    }),
    operacionAuditoria({
      tenantId: session.user.tenantId,
      usuario: session.user,
      accion: "ELIMINAR",
      entidad: "Contacto",
      entidadId: existente.id,
      descripcion: `Envió a la papelera el contacto "${existente.nombre}"`,
      antes: existente,
      peticion: _req,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
