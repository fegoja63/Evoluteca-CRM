import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { seriesTendencias } from "@/lib/tendencias";

export const dynamic = "force-dynamic";

// Series de tendencia (últimos 12 meses + pipeline abierto por etapa) para las
// gráficas de Reportes. Es puro cálculo determinista sobre los datos reales —
// no usa IA ni consume cupo. Comparte la fuente (src/lib/tendencias.ts) con el
// análisis con IA, así las gráficas y el texto muestran las mismas cifras.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  const [ops, etapasTenant] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { tenantId, eliminadoEn: null, ...ownerFiltro },
      select: {
        etapa: true, valor: true, probabilidad: true, creadoEn: true,
        fechaCierre: true, fechaEvento: true, extras: true,
      },
    }),
    prisma.etapaPipeline.findMany({ where: { tenantId }, select: { key: true, nombre: true, orden: true }, orderBy: { orden: "asc" } }),
  ]);

  const etapasBase = etapasTenant.length ? etapasTenant : [
    { key: "PROSPECTO", nombre: "Prospecto", orden: 1 },
    { key: "CALIFICADO", nombre: "Calificado", orden: 2 },
    { key: "PROPUESTA", nombre: "Propuesta", orden: 3 },
    { key: "NEGOCIACION", nombre: "Negociación", orden: 4 },
  ];

  const t = seriesTendencias(ops, etapasBase);

  return NextResponse.json(
    {
      meses: t.meses.map(m => ({ label: m.label, ganado: m.ganado, tasa: m.tasa, creadas: m.creadas })),
      porEtapa: t.porEtapa.map(e => ({ nombre: e.nombre, valor: e.valor, cantidad: e.cantidad })),
      valorAbierto: t.valorAbierto,
      trimestre: t.trimestre,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
