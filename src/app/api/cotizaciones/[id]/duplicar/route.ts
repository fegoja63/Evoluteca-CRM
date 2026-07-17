import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const original = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: { items: true },
  });
  if (!original) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  // numero usa el autoincrement de Postgres (mismo default del schema que ya usa
  // la creación normal) — no se calcula a mano "último + 1", que bajo dos
  // duplicaciones simultáneas podía generar el mismo número dos veces.
  const nueva = await prisma.cotizacion.create({
    data: {
      tenantId:      original.tenantId,
      estado:        "BORRADOR",
      empresaId:     original.empresaId,
      contactoId:    original.contactoId,
      oportunidadId: original.oportunidadId,
      sede:          original.sede,
      notas:         original.notas,
      condicionesComerciales: original.condicionesComerciales,
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
