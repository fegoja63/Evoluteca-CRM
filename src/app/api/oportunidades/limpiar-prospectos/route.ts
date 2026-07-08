import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!puedeEliminar(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
  }

  const { count } = await prisma.oportunidad.deleteMany({
    where: {
      tenantId: session.user.tenantId,
      etapa: { in: ["PROSPECTO", "CALIFICADO"] },
      cotizaciones: { none: {} },
    },
  });

  return NextResponse.json({ ok: true, eliminadas: count });
}
