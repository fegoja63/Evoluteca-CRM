import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const original = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { items: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const ultimo = await prisma.cotizacion.findFirst({
    where: { tenantId: session.user.tenantId },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });

  const nueva = await prisma.cotizacion.create({
    data: {
      tenantId:      original.tenantId,
      numero:        (ultimo?.numero ?? 0) + 1,
      estado:        "BORRADOR",
      empresaId:     original.empresaId,
      contactoId:    original.contactoId,
      oportunidadId: original.oportunidadId,
      sede:          original.sede,
      notas:         original.notas,
      creadoBy:      session.user.id,
      items: {
        create: original.items.map(i => ({
          descripcion: i.descripcion,
          cantidad:    i.cantidad,
          precioUnit:  i.precioUnit,
        })),
      },
    },
  });

  return NextResponse.json({ id: nueva.id });
}
