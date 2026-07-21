import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarProductoSchema } from "@/lib/validations/productos";
import { parseOrError } from "@/lib/validations/helpers";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const raw = await req.json();
  const { data: body, error } = parseOrError(editarProductoSchema, raw);
  if (error) return error;
  await prisma.producto.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre.trim() }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
      ...(body.precioBase !== undefined && { precioBase: body.precioBase }),
      ...(body.activo !== undefined && { activo: body.activo }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }
  await prisma.producto.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { activo: false },
  });
  return NextResponse.json({ ok: true });
}
