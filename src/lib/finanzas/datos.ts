/**
 * Carga de datos y guarda para las PANTALLAS del Gerente Financiero (las rutas
 * de la API usan `exigirAccesoFinanzas`). Las mismas reglas: Administrador o
 * Gerente, y licencia vigente o vencida (solo lectura).
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estadoLicencia, type ResumenLicencia } from "@/lib/licencias";
import { diaISO, fechaISO } from "@/lib/fecha-bogota";
import { rolVeFinanzas, aPeriodo, aBalance } from "./acceso";
import { indicadores, type Balance, type Periodo } from "./estados";
import { supuestosSugeridos, type NegocioPipeline, type Supuestos } from "./caja";

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

export type DatosCaja = DatosFinancieros & {
  hoy: string;
  supuestos: Supuestos;
  /** false = todavía no los ha guardado: son los sugeridos desde los estados. */
  supuestosGuardados: boolean;
  pipeline: NegocioPipeline[];
  soloFinanzas: boolean;
};

const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"] as const;

export async function cargarDatosCaja(tenantId: string): Promise<DatosCaja> {
  const [datos, guardados, tenant] = await Promise.all([
    cargarDatosFinancieros(tenantId),
    prisma.supuestosCaja.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { soloFinanzas: true } }),
  ]);
  const soloFinanzas = tenant?.soloFinanzas ?? false;

  // El pipeline del CRM (negocios abiertos con valor y fecha de cierre). Una
  // cuenta solo Finanzas no tiene CRM.
  const oportunidades = soloFinanzas ? [] : await prisma.oportunidad.findMany({
    where: { tenantId, eliminadoEn: null, etapa: { in: [...ETAPAS_ACTIVAS] }, valor: { gt: 0 }, fechaCierre: { not: null } },
    select: { titulo: true, valor: true, probabilidad: true, fechaCierre: true },
  });

  const dias = indicadores(datos.periodos, datos.balance).find(i => i.clave === "diasCartera")?.valor ?? null;
  const supuestos: Supuestos = guardados ? {
    nominaMensual: Number(guardados.nominaMensual), gastosFijosMensuales: Number(guardados.gastosFijosMensuales),
    cuotaDeudaMensual: Number(guardados.cuotaDeudaMensual), proveedoresSemanales: Number(guardados.proveedoresSemanales),
    impuestosMensuales: Number(guardados.impuestosMensuales), ventasContadoSemanales: Number(guardados.ventasContadoSemanales),
    diasCobro: guardados.diasCobro,
  } : supuestosSugeridos(datos.periodos, dias);

  return {
    ...datos,
    hoy: fechaISO(),
    supuestos,
    supuestosGuardados: !!guardados,
    soloFinanzas,
    pipeline: oportunidades.map(o => ({
      titulo: o.titulo, valor: Number(o.valor), probabilidad: o.probabilidad, fechaCierre: diaISO(o.fechaCierre!),
    })),
  };
}
