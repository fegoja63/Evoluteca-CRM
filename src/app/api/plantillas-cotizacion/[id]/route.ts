import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { editarPlantillaSchema } from "@/lib/validations/plantillas";
import { parseOrError } from "@/lib/validations/helpers";

// DELETE — eliminar plantilla
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const plantilla = await prisma.plantillaCotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!plantilla) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  await prisma.plantillaCotizacion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

// PATCH — renombrar y/o editar los ítems de una plantilla. Si "items" viene
// en el body, reemplaza la lista completa (se borran los ítems actuales y
// se crean los nuevos) — más simple y confiable que intentar hacer merge
// ítem por ítem cuando el usuario pudo agregar, quitar y reordenar a la vez.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { data, error } = parseOrError(editarPlantillaSchema, body);
  if (error) return error;
  const { nombre, items } = data;

  const existente = await prisma.plantillaCotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const plantilla = await prisma.plantillaCotizacion.update({
    where: { id: params.id },
    data: {
      nombre: nombre.trim(),
      ...(items !== undefined && {
        items: {
          deleteMany: {},
          create: items.map(it => ({
            descripcion: it.descripcion.trim(),
            cantidad: it.cantidad ?? 1,
            precioUnit: it.precioUnit ?? 0,
          })),
        },
      }),
    },
    include: { items: true },
  });

  return NextResponse.json(plantilla);
}
