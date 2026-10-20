/**
 * Carga de datos y guarda para las PANTALLAS del Gerente Financiero (las rutas
 * de la API usan `exigirAccesoFinanzas`). Las mismas reglas: Administrador o
 * Gerente, y licencia vigente o vencida (solo lectura).
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estadoLicencia, type ResumenLicencia } from "@/lib/licencias";
import { diaISO } from "@/lib/fecha-bogota";
import { rolVeFinanzas, aPeriodo, aBalance } from "./acceso";
import type { Balance, Periodo } from "./estados";

export type AccesoPagina =
  | { bloqueo: "rol" | "licencia"; licencia: ResumenLicencia }
  | { bloqueo: null; tenantId: string; licencia: ResumenLicencia; soloLectura: boolean };

export async function accesoPaginaFinanzas(): Promise<AccesoPagina> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const licencia = await estadoLicencia(session.user.tenantId, "FINANZAS");
  if (!rolVeFinanzas(session.user.rol)) return { bloqueo: "rol", licencia };
  if (licencia.estado === "SIN_LICENCIA") return { bloqueo: "licencia", licencia };
  return { bloqueo: null, tenantId: session.user.tenantId, licencia, soloLectura: licencia.estado === "VENCIDA" };
}

export type DatosFinancieros = {
  periodos: Periodo[];
  balance: (Balance & { corte: string }) | null;
};

export async function cargarDatosFinancieros(tenantId: string): Promise<DatosFinancieros> {
  const [filas, bal] = await Promise.all([
    prisma.periodoFinanciero.findMany({ where: { tenantId }, orderBy: { mes: "asc" } }),
    prisma.balanceFinanciero.findFirst({ where: { tenantId }, orderBy: { corte: "desc" } }),
  ]);
  return {
    periodos: filas.map(aPeriodo),
    balance: bal ? { corte: diaISO(bal.corte), ...aBalance(bal) } : null,
  };
}
