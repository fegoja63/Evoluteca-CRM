import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede limpiar datos" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;

  // Borrar en orden para respetar relaciones
  await prisma.npsRespuesta.deleteMany({ where: { funcion: { tenantId } } });
  await prisma.funcion.deleteMany({ where: { tenantId } });
  await prisma.espectador.deleteMany({ where: { tenantId } });
  await prisma.itemCotizacion.deleteMany({ where: { cotizacion: { tenantId } } });
  await prisma.cotizacion.deleteMany({ where: { tenantId } });
  await prisma.actividad.deleteMany({ where: { tenantId } });
  await prisma.oportunidad.deleteMany({ where: { tenantId } });
  await prisma.contacto.deleteMany({ where: { tenantId } });
  await prisma.empresa.deleteMany({ where: { tenantId } });

  return NextResponse.json({ ok: true });
}
