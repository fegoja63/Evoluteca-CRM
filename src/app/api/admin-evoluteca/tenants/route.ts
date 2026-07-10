import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const tenants = await prisma.tenant.findMany({
    orderBy: { creadoEn: "desc" },
    select: {
      id: true, nombre: true, slug: true, plan: true, activo: true,
      creadoEn: true, modulos: true, emailsActivos: true,
      _count: { select: { usuarios: true, empresas: true, cotizaciones: true } },
    },
  });

  return NextResponse.json(tenants);
}
