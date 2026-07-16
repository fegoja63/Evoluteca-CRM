import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const periodo = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const tenants = await prisma.tenant.findMany({
    orderBy: { creadoEn: "desc" },
    select: {
      id: true, nombre: true, slug: true, plan: true, activo: true,
      creadoEn: true, modulos: true, emailsActivos: true, limiteUsuarios: true,
      limiteResumenesIA: true,
      usoIA: { where: { periodo }, select: { cantidad: true } },
      _count: { select: { usuarios: true, empresas: true, cotizaciones: true } },
    },
  });

  // Aplana el consumo de IA del mes actual a un número simple por tenant.
  const conUso = tenants.map(({ usoIA, ...t }) => ({
    ...t,
    resumenesIAUsados: usoIA[0]?.cantidad ?? 0,
  }));

  return NextResponse.json(conUso);
}
