import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { supuestosCajaSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

// Guarda los supuestos de la caja proyectada del tenant (uno por tenant).
export async function PUT(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(supuestosCajaSchema, await req.json().catch(() => null));
  if (error) return error;
  const { tenantId } = acceso;

  await prisma.supuestosCaja.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
  return NextResponse.json({ ok: true });
}
