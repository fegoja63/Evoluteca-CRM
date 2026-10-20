import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas, aBalance } from "@/lib/finanzas/acceso";
import { balanceSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";
import { fechaDesdeBogota, diaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

// Último balance cargado (los indicadores usan el corte más reciente).
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const fila = await prisma.balanceFinanciero.findFirst({ where: { tenantId: acceso.tenantId }, orderBy: { corte: "desc" } });
  if (!fila) return NextResponse.json(null);
  return NextResponse.json({ corte: diaISO(fila.corte), ...aBalance(fila) });
}

// Guarda el balance a una fecha de corte; si ya hay uno en esa fecha se reemplaza.
export async function PUT(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(balanceSchema, await req.json().catch(() => null));
  if (error) return error;
  const { corte, ...montos } = data;
  const tenantId = acceso.tenantId;
  const dia = fechaDesdeBogota(corte);

  await prisma.balanceFinanciero.upsert({
    where: { tenantId_corte: { tenantId, corte: dia } },
    create: { tenantId, corte: dia, ...montos },
    update: montos,
  });
  return NextResponse.json({ ok: true });
}
