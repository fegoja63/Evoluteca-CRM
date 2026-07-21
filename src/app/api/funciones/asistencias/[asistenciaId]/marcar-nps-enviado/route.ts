import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, props: { params: Promise<{ asistenciaId: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const existente = await prisma.asistencia.findFirst({
    where: { id: params.asistenciaId, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const actualizada = await prisma.asistencia.update({
    where: { id: params.asistenciaId },
    data: { npsSolicitadoEn: new Date() },
  });

  return NextResponse.json(actualizada);
}
