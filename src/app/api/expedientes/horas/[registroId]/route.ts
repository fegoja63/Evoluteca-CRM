import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar, moduloActivo } from "@/lib/permisos";

export async function DELETE(_req: Request, props: { params: Promise<{ registroId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { modulos: true } });
  if (!moduloActivo(tenant?.modulos, "expedientes")) {
    return NextResponse.json({ error: "El módulo Expedientes no está activo" }, { status: 403 });
  }

  const existente = await prisma.registroHoras.findFirst({
    where: { id: params.registroId, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const esDueno = existente.usuarioId === session.user.id;
  if (!esDueno && !puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar este registro" }, { status: 403 });
  }

  await prisma.registroHoras.delete({ where: { id: params.registroId } });
  return NextResponse.json({ ok: true });
}
