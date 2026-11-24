/**
 * Carga de datos y guarda para las PANTALLAS del Gerente Financiero (las rutas
 * de la API usan `exigirAccesoFinanzas`). Las mismas reglas: Administrador o
 * Gerente, y licencia vigente o vencida (solo lectura).
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { estadoLicencia, type ResumenLicencia } from "@/lib/licencias";
import { diaISO, fechaISO, fechaDesdeBogota } from "@/lib/fecha-bogota";
import { rolVeFinanzas, aPeriodo, aBalance, aCierre } from "./acceso";
import { indicadores, ultimosMeses, type Balance, type Indicador, type Periodo } from "./estados";
import { modoAnalisis, mesesDelCierre, type ModoAnalisis } from "./modo";
import { supuestosSugeridos, type FacturaPorCobrar, type NegocioPipeline, type Supuestos } from "./caja";

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
  /** Los meses cargados (estado de resultados mes a mes). */
  periodos: Periodo[];
  /** Cierres anuales (mes = "YYYY"), del más viejo al más reciente. */
  cierres: Periodo[];
  /**
   * "anual" si lo más reciente que tiene la empresa es un cierre de año (no hay
   * meses posteriores): el análisis compara año contra año. Ver lib/finanzas/modo.
   */
  modo: ModoAnalisis;
  balance: (Balance & { corte: string }) | null;
  /** El corte anterior al último (para comparar balances). */
  balanceAnterior: (Balance & { corte: string }) | null;
  /** A qué se dedica la empresa según sus estados (lectura con IA). */
  actividad: string | null;
};

export async function cargarDatosFinancieros(tenantId: string): Promise<DatosFinancieros> {
  const [filas, cierresDb, balances, tenant] = await Promise.all([
    prisma.periodoFinanciero.findMany({ where: { tenantId }, orderBy: { mes: "asc" } }),
    prisma.cierreAnual.findMany({ where: { tenantId }, orderBy: { anio: "asc" } }),
    prisma.balanceFinanciero.findMany({ where: { tenantId }, orderBy: { corte: "desc" }, take: 2 }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { actividadFinanciera: true } }),
  ]);
  const periodos = filas.map(aPeriodo);
  const cierres = cierresDb.map(aCierre);
  const conCorte = (b: (typeof balances)[number] | undefined) => (b ? { corte: diaISO(b.corte), ...aBalance(b) } : null);
  return {
    periodos, cierres, modo: modoAnalisis(periodos, cierres),
    balance: conCorte(balances[0]), balanceAnterior: conCorte(balances[1]),
    actividad: tenant?.actividadFinanciera ?? null,
  };
}

/**
 * Los meses con que trabajan la caja, el punto de equilibrio y las demás
 * cuentas mensuales. Con un cierre anual son el año repartido en 12 meses
 * iguales (promedios), porque no hay detalle mes a mes.
 */
export function mesesDeCalculo(d: DatosFinancieros): Periodo[] {
  return d.modo === "anual" ? mesesDelCierre(d.cierres[d.cierres.length - 1]) : d.periodos;
}

/** Indicadores con los datos del modo: el último cierre anual o los últimos 12 meses. */
export function indicadoresDe(d: DatosFinancieros): Indicador[] {
  return d.modo === "anual"
    ? indicadores(d.cierres.slice(-1), d.balance, { anual: true })
    : indicadores(ultimosMeses(d.periodos, 12), d.balance);
}

export type DatosCaja = DatosFinancieros & {
  /** Los meses cargados de verdad (en `periodos` van los de cálculo). */
  mesesReales: Periodo[];
  hoy: string;
  supuestos: Supuestos;
  /** false = todavía no los ha guardado: son los sugeridos desde los estados. */
  supuestosGuardados: boolean;
  pipeline: NegocioPipeline[];
  soloFinanzas: boolean;
  /** Valor de los negocios ganados con cierre en el mes en curso (CRM). */
  ganadoMes: number;
  /** Cartera factura por factura, si la empresa la cargó. */
  carteraDetalle: FacturaPorCobrar[];
};

const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"] as const;

export async function cargarDatosCaja(tenantId: string): Promise<DatosCaja> {
  const [datos, guardados, tenant, facturas] = await Promise.all([
    cargarDatosFinancieros(tenantId),
    prisma.supuestosCaja.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { soloFinanzas: true } }),
    prisma.cuentaPorCobrar.findMany({ where: { tenantId }, orderBy: { vence: "asc" } }),
  ]);
  const soloFinanzas = tenant?.soloFinanzas ?? false;

  // El pipeline del CRM (negocios abiertos con valor y fecha de cierre). Una
  // cuenta solo Finanzas no tiene CRM.
  const oportunidades = soloFinanzas ? [] : await prisma.oportunidad.findMany({
    where: { tenantId, eliminadoEn: null, etapa: { in: [...ETAPAS_ACTIVAS] }, valor: { gt: 0 }, fechaCierre: { not: null } },
    select: { id: true, titulo: true, etapa: true, valor: true, probabilidad: true, fechaCierre: true },
  });

  // Lo ganado en el mes en curso (Bogotá), para el punto de equilibrio del mes.
  const hoy = fechaISO();
  const [anio, mes] = hoy.split("-").map(Number);
  const ganadas = soloFinanzas ? null : await prisma.oportunidad.aggregate({
    where: {
      tenantId, eliminadoEn: null, etapa: "GANADA",
      fechaCierre: { gte: fechaDesdeBogota(`${hoy.slice(0, 7)}-01`), lt: fechaDesdeBogota(`${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}-01`) },
    },
    _sum: { valor: true },
  });

  const dias = indicadoresDe(datos).find(i => i.clave === "diasCartera")?.valor ?? null;
  const meses = mesesDeCalculo(datos);
  const supuestos: Supuestos = guardados ? {
    nominaMensual: Number(guardados.nominaMensual), gastosFijosMensuales: Number(guardados.gastosFijosMensuales),
    cuotaDeudaMensual: Number(guardados.cuotaDeudaMensual), proveedoresSemanales: Number(guardados.proveedoresSemanales),
    impuestosMensuales: Number(guardados.impuestosMensuales), ventasContadoSemanales: Number(guardados.ventasContadoSemanales),
    diasCobro: guardados.diasCobro,
    ivaBimestral: Number(guardados.ivaBimestral), diaImpuestos: guardados.diaImpuestos,
    ingresosRecurrentes: Number(guardados.ingresosRecurrentes), plazoRecurrentes: guardados.plazoRecurrentes,
    ventasProyectadas: Array.isArray(guardados.ventasProyectadas) ? (guardados.ventasProyectadas as { mes: string; monto: number }[]) : [],
  } : supuestosSugeridos(meses, dias, { sinCRM: soloFinanzas });

  return {
    ...datos,
    // La caja y el punto de equilibrio trabajan con meses (en el modo anual,
    // el año repartido en promedios); los meses reales quedan en mesesReales.
    periodos: meses,
    mesesReales: datos.periodos,
    hoy,
    ganadoMes: Number(ganadas?._sum.valor ?? 0),
    carteraDetalle: facturas.map(f => ({ cliente: f.cliente, monto: Number(f.monto), vence: diaISO(f.vence) })),
    supuestos,
    supuestosGuardados: !!guardados,
    soloFinanzas,
    pipeline: oportunidades.map(o => ({
      id: o.id, titulo: o.titulo, etapa: o.etapa, valor: Number(o.valor), probabilidad: o.probabilidad, fechaCierre: diaISO(o.fechaCierre!),
    })),
  };
}
