import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { estado } = body;

  const cotizacion = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!cotizacion) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const actualizada = await prisma.cotizacion.update({
    where: { id: params.id },
    data: { estado },
  });

  return NextResponse.json(actualizada);
}
