import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;

  await prisma.$transaction([
    prisma.npsRespuesta.deleteMany({ where: { funcion: { tenantId } } }),
    prisma.itemCotizacion.deleteMany({ where: { cotizacion: { tenantId } } }),
    prisma.cotizacion.deleteMany({ where: { tenantId } }),
    // EventoTimeline con empresaId ya se borra en cascada al borrar la empresa,
    // pero uno vinculado solo a un contacto (o a ninguno) no — se borra aparte
    // para no dejar registros huérfanos del tenant tras "limpiar datos".
    prisma.eventoTimeline.deleteMany({ where: { tenantId } }),
    prisma.actividad.deleteMany({ where: { tenantId } }),
    prisma.oportunidad.deleteMany({ where: { tenantId } }),
    prisma.espectador.deleteMany({ where: { tenantId } }),
    prisma.funcion.deleteMany({ where: { tenantId } }),
    prisma.contacto.deleteMany({ where: { tenantId } }),
    prisma.empresa.deleteMany({ where: { tenantId } }),
  ]);

  return NextResponse.json({ ok: true });
}
