import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";
import { crearLicenciaSchema } from "@/lib/validations/tenants";
import { parseOrError } from "@/lib/validations/helpers";
import { fechaDesdeBogota } from "@/lib/fecha-bogota";
import { resumirLicencias } from "@/lib/licencias";

export const dynamic = "force-dynamic";

// Licencias de módulos de pago de un tenant (ver lib/licencias.ts). Solo el
// panel interno de Evoluteca: ninguna ruta del tenant puede crearlas.

async function historialYEstado(tenantId: string) {
  const historial = await prisma.licenciaModulo.findMany({
    where: { tenantId },
    orderBy: { creadaEn: "desc" },
  });
  const finanzas = resumirLicencias(historial.filter(l => l.producto === "FINANZAS"));
  return { estados: { FINANZAS: finanzas }, historial };
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(await historialYEstado(params.id));
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const tenant = await prisma.tenant.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data, error } = parseOrError(crearLicenciaSchema, await req.json());
  if (error) return error;

  await prisma.licenciaModulo.create({
    data: {
      tenantId: params.id,
      producto: data.producto,
      desde: fechaDesdeBogota(data.desde),
      hasta: fechaDesdeBogota(data.hasta),
      referenciaPago: data.referenciaPago,
      nota: data.nota || null,
    },
  });

  return NextResponse.json(await historialYEstado(params.id), { status: 201 });
}
