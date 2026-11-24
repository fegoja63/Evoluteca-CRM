import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas, aCierre } from "@/lib/finanzas/acceso";
import { guardarCierresSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

// Cierres anuales del tenant (estado de resultados de cada año completo).
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const filas = await prisma.cierreAnual.findMany({ where: { tenantId: acceso.tenantId }, orderBy: { anio: "asc" } });
  return NextResponse.json(filas.map(aCierre));
}

// Guarda uno o varios años (si el año ya existe se reemplaza) y, si viene, a
// qué se dedica la empresa según sus estados financieros.
export async function PUT(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(guardarCierresSchema, await req.json().catch(() => null));
  if (error) return error;
  const { tenantId } = acceso;

  await prisma.$transaction([
    ...data.cierres.map(({ anio, ...montos }) =>
      prisma.cierreAnual.upsert({
        where: { tenantId_anio: { tenantId, anio } },
        create: { tenantId, anio, ...montos },
        update: montos,
      })),
    ...(data.actividad ? [prisma.tenant.update({ where: { id: tenantId }, data: { actividadFinanciera: data.actividad } })] : []),
  ]);

  return NextResponse.json({ guardados: data.cierres.length });
}

// Borra un año: DELETE /api/finanzas/cierres?anio=2025
export async function DELETE(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const anio = Number(new URL(req.url).searchParams.get("anio"));
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return NextResponse.json({ error: "Año inválido" }, { status: 400 });

  const { count } = await prisma.cierreAnual.deleteMany({ where: { tenantId: acceso.tenantId, anio } });
  if (count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
