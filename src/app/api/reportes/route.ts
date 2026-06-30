import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const [totalEmpresas, totalContactos, oportunidades, cotizaciones, actividadesPendientes] =
    await Promise.all([
      prisma.empresa.count({ where: { tenantId } }),
      prisma.contacto.count({ where: { tenantId } }),
      prisma.oportunidad.findMany({ where: { tenantId }, select: { etapa: true, valor: true } }),
      prisma.cotizacion.findMany({
        where: { tenantId },
        select: { estado: true, items: { select: { cantidad: true, precioUnit: true } } },
      }),
      prisma.actividad.count({ where: { tenantId, completada: false } }),
    ]);

  const oportunidadesPorEtapa: Record<string, number> = {};
  let valorPipeline = 0;
  for (const o of oportunidades) {
    oportunidadesPorEtapa[o.etapa] = (oportunidadesPorEtapa[o.etapa] ?? 0) + 1;
    if (o.etapa !== "PERDIDA") valorPipeline += Number(o.valor ?? 0);
  }

  const cotizacionesPorEstado: Record<string, number> = {};
  let valorCotizado = 0;
  for (const c of cotizaciones) {
    cotizacionesPorEstado[c.estado] = (cotizacionesPorEstado[c.estado] ?? 0) + 1;
    valorCotizado += c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
  }

  return NextResponse.json({
    totalEmpresas,
    totalContactos,
    totalOportunidades: oportunidades.length,
    valorPipeline,
    oportunidadesPorEtapa,
    totalCotizaciones: cotizaciones.length,
    valorCotizado,
    cotizacionesPorEstado,
    actividadesPendientes,
  });
}
