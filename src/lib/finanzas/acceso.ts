/**
 * Quién puede usar el Gerente Financiero. Las finanzas de la empresa son
 * información de dirección: las ven el Administrador y el Gerente, no los
 * comerciales. Además el tenant necesita la licencia (ver lib/licencias):
 * vencida deja consultar, no modificar.
 */
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { exigirLicencia } from "@/lib/licencias";
import type { Balance, Periodo } from "./estados";

export const ROLES_FINANZAS = ["ADMINISTRADOR", "GERENTE"];

export function rolVeFinanzas(rol: string | undefined): boolean {
  return !!rol && ROLES_FINANZAS.includes(rol);
}

/** Guarda de las rutas /api/finanzas: devuelve el tenant o la respuesta de error. */
export async function exigirAccesoFinanzas(uso: "leer" | "editar"): Promise<{ tenantId: string } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  if (!rolVeFinanzas(session.user.rol)) {
    return { error: NextResponse.json({ error: "El Gerente Financiero es solo para administradores y gerentes." }, { status: 403 }) };
  }
  const denegado = await exigirLicencia(session.user.tenantId, "FINANZAS", uso);
  if (denegado) return { error: denegado };
  return { tenantId: session.user.tenantId };
}

// ── De la base (Decimal) a números para los cálculos ────────────────────────

type FilaPeriodo = { mes: string; ventas: Prisma.Decimal; costoVentas: Prisma.Decimal; gastosAdmin: Prisma.Decimal; gastosVentas: Prisma.Decimal; depreciacion: Prisma.Decimal; intereses: Prisma.Decimal };

export function aPeriodo(f: FilaPeriodo): Periodo {
  return {
    mes: f.mes, ventas: Number(f.ventas), costoVentas: Number(f.costoVentas), gastosAdmin: Number(f.gastosAdmin),
    gastosVentas: Number(f.gastosVentas), depreciacion: Number(f.depreciacion), intereses: Number(f.intereses),
  };
}

export const CAMPOS_BALANCE = [
  "caja", "cuentasPorCobrar", "inventario", "otrosActivosCorrientes", "activosFijos",
  "proveedores", "obligacionesCP", "impuestosLaborales", "deudaLP", "patrimonio",
] as const;

export function aBalance(f: Record<(typeof CAMPOS_BALANCE)[number], Prisma.Decimal>): Balance {
  return Object.fromEntries(CAMPOS_BALANCE.map(c => [c, Number(f[c])])) as Balance;
}
