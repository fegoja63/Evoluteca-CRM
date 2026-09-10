import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarObjecionSchema } from "@/lib/validations/objeciones";
import { parseOrError } from "@/lib/validations/helpers";

// Verifica que la objeción exista y sea del tenant del usuario.
async function propiaDelTenant(id: string, tenantId: string) {
  const o = await prisma.objecion.findFirst({ where: { id, tenantId }, select: { id: true } });
  return !!o;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Solo Administrador o Gerente pueden editar la guía." }, { status: 403 });

  const { id } = await params;
  if (!(await propiaDelTenant(id, session.user.tenantId))) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json();
  const { data, error } = parseOrError(editarObjecionSchema, body);
  if (error) return error;

  const objecion = await prisma.objecion.update({
    where: { id },
    data: {
      ...(data.categoria !== undefined && { categoria: data.categoria?.trim() || null }),
      ...(data.objecion !== undefined && { objecion: data.objecion.trim() }),
      ...(data.respuesta !== undefined && { respuesta: data.respuesta.trim() }),
      ...(data.loQueNoDecir !== undefined && { loQueNoDecir: data.loQueNoDecir?.trim() || null }),
      ...(data.motivoPerdida !== undefined && { motivoPerdida: data.motivoPerdida?.trim() || null }),
      ...(data.activa !== undefined && { activa: data.activa }),
      ...(data.orden !== undefined && { orden: data.orden }),
    },
  });
  return NextResponse.json(objecion);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Solo Administrador o Gerente pueden editar la guía." }, { status: 403 });

  const { id } = await params;
  if (!(await propiaDelTenant(id, session.user.tenantId))) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.objecion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
