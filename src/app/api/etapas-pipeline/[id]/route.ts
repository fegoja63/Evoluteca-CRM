import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ocultar/mostrar una etapa del Pipeline. "Ganada" y "Perdida" nunca se
// pueden ocultar (el Dashboard, Reportes y el cron de alertas dependen de
// que siempre existan), y una etapa con oportunidades asignadas tampoco —
// para no dejar negocios reales sin una columna donde mostrarse.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json();
  if (typeof body?.oculta !== "boolean") {
    return NextResponse.json({ error: "oculta debe ser true o false" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const etapa = await prisma.etapaPipeline.findFirst({ where: { id: params.id, tenantId } });
  if (!etapa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (body.oculta) {
    if (etapa.key === "GANADA" || etapa.key === "PERDIDA") {
      return NextResponse.json({ error: "Las etapas Ganada y Perdida no se pueden ocultar" }, { status: 400 });
    }
    const enUso = await prisma.oportunidad.count({ where: { tenantId, eliminadoEn: null, etapa: etapa.key as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" } });
    if (enUso > 0) {
      return NextResponse.json({ error: `No se puede ocultar: hay ${enUso} oportunidad(es) en esta etapa` }, { status: 400 });
    }
  }

  const actualizada = await prisma.etapaPipeline.update({ where: { id: params.id }, data: { oculta: body.oculta } });
  return NextResponse.json(actualizada);
}
