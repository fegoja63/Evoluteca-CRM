import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { facturasSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";
import { fechaDesdeBogota, diaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

// Cartera por cobrar factura por factura (opcional): si existe, la caja cobra
// cada factura al vencer en lugar de repartir el total del balance.
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const filas = await prisma.cuentaPorCobrar.findMany({ where: { tenantId: acceso.tenantId }, orderBy: { vence: "asc" } });
  return NextResponse.json(filas.map(f => ({ id: f.id, cliente: f.cliente, monto: Number(f.monto), vence: diaISO(f.vence) })));
}

// Agrega una o varias facturas.
export async function POST(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(facturasSchema, await req.json().catch(() => null));
  if (error) return error;
  const { tenantId } = acceso;
  const { count } = await prisma.cuentaPorCobrar.createMany({
    data: data.facturas.map(f => ({ tenantId, cliente: f.cliente, monto: f.monto, vence: fechaDesdeBogota(f.vence) })),
  });
  return NextResponse.json({ guardadas: count });
}

// Borra una factura (?id=…) o toda la cartera (?todas=1).
export async function DELETE(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const params = new URL(req.url).searchParams;
  const { tenantId } = acceso;
  if (params.get("todas") === "1") {
    const { count } = await prisma.cuentaPorCobrar.deleteMany({ where: { tenantId } });
    return NextResponse.json({ borradas: count });
  }
  const id = params.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Falta la factura" }, { status: 400 });
  const { count } = await prisma.cuentaPorCobrar.deleteMany({ where: { id, tenantId } });
  if (count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
