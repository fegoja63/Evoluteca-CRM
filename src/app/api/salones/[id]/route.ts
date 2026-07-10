import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarSalonSchema } from "@/lib/validations/salones";
import { parseOrError } from "@/lib/validations/helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const raw = await req.json();
  const { data: body, error } = parseOrError(editarSalonSchema, raw);
  if (error) return error;
  await prisma.salon.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
      ...(body.capacidad !== undefined && { capacidad: body.capacidad ?? null }),
      ...(body.activo !== undefined && { activo: body.activo }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }
  await prisma.salon.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { activo: false },
  });
  return NextResponse.json({ ok: true });
}
