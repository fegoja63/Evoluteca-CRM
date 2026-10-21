import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { rentabilidadSchema } from "@/lib/validations/finanzas";
import { parseOrError } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

// Rentabilidad por cliente de los últimos 12 meses.
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const filas = await prisma.rentabilidadCliente.findMany({ where: { tenantId: acceso.tenantId }, orderBy: { ventas: "desc" } });
  return NextResponse.json(filas.map(f => ({ cliente: f.cliente, ventas: Number(f.ventas), costo: Number(f.costo), diasPago: f.diasPago })));
}

// Reemplaza la lista completa (la pantalla siempre envía todos los clientes).
export async function PUT(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const { data, error } = parseOrError(rentabilidadSchema, await req.json().catch(() => null));
  if (error) return error;
  const { tenantId } = acceso;
  await prisma.$transaction([
    prisma.rentabilidadCliente.deleteMany({ where: { tenantId } }),
    prisma.rentabilidadCliente.createMany({ data: data.clientes.map(c => ({ tenantId, ...c })) }),
  ]);
  return NextResponse.json({ guardados: data.clientes.length });
}
