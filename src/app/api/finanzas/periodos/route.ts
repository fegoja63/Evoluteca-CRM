import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas, aPeriodo } from "@/lib/finanzas/acceso";
import { guardarPeriodosSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

// Estado de resultados mes a mes del tenant.
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const filas = await prisma.periodoFinanciero.findMany({ where: { tenantId: acceso.tenantId }, orderBy: { mes: "asc" } });
  return NextResponse.json(filas.map(aPeriodo));
}

// Guarda uno o varios meses: si el mes ya existe se reemplaza (así una
// plantilla corregida se puede volver a subir sin duplicar).
export async function PUT(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(guardarPeriodosSchema, await req.json().catch(() => null));
  if (error) return error;
  const { tenantId } = acceso;

  await prisma.$transaction(data.periodos.map(({ mes, ...montos }) =>
    prisma.periodoFinanciero.upsert({
      where: { tenantId_mes: { tenantId, mes } },
      create: { tenantId, mes, ...montos },
      update: montos,
    })));

  return NextResponse.json({ guardados: data.periodos.length });
}

// Borra un mes: DELETE /api/finanzas/periodos?mes=2026-01
export async function DELETE(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const mes = new URL(req.url).searchParams.get("mes") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return NextResponse.json({ error: "Mes inválido" }, { status: 400 });

  const { count } = await prisma.periodoFinanciero.deleteMany({ where: { tenantId: acceso.tenantId, mes } });
  if (count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
