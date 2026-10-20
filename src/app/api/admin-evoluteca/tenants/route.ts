import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";
import { saludDeUso, SALUD_VACIA } from "@/lib/salud-uso";
import { resumirLicencias } from "@/lib/licencias";

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
      limiteResumenesIA: true, licenciaVenceEn: true, licenciaAvisoEn: true, licenciaAvisadaEn: true,
      usoIA: { where: { periodo }, select: { cantidad: true } },
      licenciasModulo: { where: { producto: "FINANZAS" }, select: { desde: true, hasta: true, revocadaEn: true } },
      _count: { select: { usuarios: true, empresas: true, cotizaciones: true } },
    },
  });

  const salud = await saludDeUso();

  // Aplana el consumo de IA del mes actual a un número simple por tenant, y
  // las licencias de módulos de pago a su estado de hoy.
  const conUso = tenants.map(({ usoIA, licenciasModulo, ...t }) => ({
    ...t,
    resumenesIAUsados: usoIA[0]?.cantidad ?? 0,
    licenciaFinanzas: resumirLicencias(licenciasModulo),
    salud: salud[t.id] ?? SALUD_VACIA,
  }));

  return NextResponse.json(conUso);
}
