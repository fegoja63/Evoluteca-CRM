import { prisma } from "@/lib/prisma";
import { inicioProximoPaso } from "@/lib/estado-comercial";

/**
 * Salud de uso por tenant, para el panel interno de Evoluteca.
 *
 * Responde "¿este cliente de verdad usa el CRM?" sin tener que consultar
 * producción a mano. Solo cuenta lo que hace la gente del cliente: un inicio
 * de sesión, una actividad registrada, un cambio de etapa, una cotización,
 * un cliente u oportunidad creados por un usuario.
 *
 * Las cargas que hace Evoluteca por script NO cuentan como uso. Esas cargas
 * crean los registros a nombre del vendedor del cliente (para que queden
 * asignados), así que se reconocen por la marca que dejan en la auditoría:
 * un registro SIN usuario ("Evoluteca (soporte)") al final de la carga. Lo
 * creado en los minutos previos a esa marca se descarta.
 */

export type NivelUso = "ACTIVO" | "ENFRIANDOSE" | "INACTIVO";

export type SaludUso = {
  /** Último movimiento hecho por alguien del cliente (ISO), o null si nunca. */
  ultimoUso: string | null;
  nivel: NivelUso;
  usuariosActivos30d: number;
  actividades7d: number;
  actividades30d: number;
  negociosNuevos30d: number;
  abiertas: number;
  abiertasConProximoPaso: number;
};

const DIA_MS = 24 * 60 * 60 * 1000;
/** Lo creado hasta 15 min antes (o 1 min después) de una marca de soporte es parte de esa carga. */
const VENTANA_CARGA_ANTES_MS = 15 * 60 * 1000;
const VENTANA_CARGA_DESPUES_MS = 60 * 1000;

type Creacion = { tenantId: string; creadoEn: Date };

/** Quita lo que entró en una carga de soporte del mismo tenant. */
export function sinCargasDeSoporte(creaciones: Creacion[], marcasSoporte: Creacion[]): Creacion[] {
  const marcas = new Map<string, number[]>();
  for (const m of marcasSoporte) marcas.set(m.tenantId, [...(marcas.get(m.tenantId) ?? []), m.creadoEn.getTime()]);
  return creaciones.filter(c => {
    const t = c.creadoEn.getTime();
    return !(marcas.get(c.tenantId) ?? []).some(m => t >= m - VENTANA_CARGA_ANTES_MS && t <= m + VENTANA_CARGA_DESPUES_MS);
  });
}

/** ACTIVO: algo en los últimos 7 días · ENFRIANDOSE: 8–30 días · INACTIVO: más de 30 o nunca. */
export function nivelDeUso(ultimoUso: Date | null, ahora: Date = new Date()): NivelUso {
  if (!ultimoUso) return "INACTIVO";
  const dias = (ahora.getTime() - ultimoUso.getTime()) / DIA_MS;
  if (dias <= 7) return "ACTIVO";
  if (dias <= 30) return "ENFRIANDOSE";
  return "INACTIVO";
}

function masReciente(...fechas: (Date | null | undefined)[]): Date | null {
  return fechas.reduce<Date | null>((a, b) => (b && (!a || b > a) ? b : a), null);
}

const ABIERTA = { etapa: { notIn: ["GANADA", "PERDIDA"] as never }, eliminadoEn: null };

export async function saludDeUso(ahora: Date = new Date()): Promise<Record<string, SaludUso>> {
  const hace7 = new Date(ahora.getTime() - 7 * DIA_MS);
  const hace30 = new Date(ahora.getTime() - 30 * DIA_MS);
  const hace90 = new Date(ahora.getTime() - 90 * DIA_MS);
  const desdePaso = inicioProximoPaso(ahora);

  const [
    ultAuditoria, ultActividad, ultCambioEtapa, ultCotizacion,
    usuarios30, act7, act30, abiertas, conPaso,
    marcasSoporte, empresasCreadas, oportunidadesCreadas,
  ] = await Promise.all([
    // Con usuarioId = lo hizo alguien del cliente (las cargas de soporte van sin usuario).
    prisma.registroAuditoria.groupBy({ by: ["tenantId"], where: { usuarioId: { not: null } }, _max: { creadoEn: true } }),
    prisma.actividad.groupBy({ by: ["tenantId"], _max: { creadoEn: true } }),
    // CambioEtapa no tiene tenantId (cuelga de la oportunidad): se trae la ventana
    // de 90 días y se agrupa aquí. Para decir "activo/enfriándose" basta con 30.
    prisma.cambioEtapa.findMany({
      where: { creadoEn: { gte: hace90 } },
      select: { creadoEn: true, oportunidad: { select: { tenantId: true } } },
    }),
    prisma.cotizacion.groupBy({ by: ["tenantId"], _max: { creadoEn: true } }),
    prisma.registroAuditoria.groupBy({ by: ["tenantId", "usuarioId"], where: { usuarioId: { not: null }, creadoEn: { gte: hace30 } } }),
    prisma.actividad.groupBy({ by: ["tenantId"], where: { creadoEn: { gte: hace7 } }, _count: { _all: true } }),
    prisma.actividad.groupBy({ by: ["tenantId"], where: { creadoEn: { gte: hace30 } }, _count: { _all: true } }),
    prisma.oportunidad.groupBy({ by: ["tenantId"], where: ABIERTA, _count: { _all: true } }),
    // Mismo criterio de "próximo paso" que el Pipeline y el correo del lunes.
    prisma.oportunidad.groupBy({
      by: ["tenantId"],
      where: { ...ABIERTA, actividades: { some: { completada: false, fecha: { gte: desdePaso } } } },
      _count: { _all: true },
    }),
    // Marcas de las cargas de soporte (auditoría sin usuario).
    prisma.registroAuditoria.findMany({ where: { usuarioId: null }, select: { tenantId: true, creadoEn: true } }),
    // Clientes y oportunidades creados por un usuario (con autor) en 90 días. Los
    // que llegan solos (formulario web, correo entrante) no tienen autor y no cuentan.
    prisma.empresa.findMany({ where: { creadoBy: { not: null }, creadoEn: { gte: hace90 } }, select: { tenantId: true, creadoEn: true } }),
    prisma.oportunidad.findMany({ where: { creadoBy: { not: null }, eliminadoEn: null, creadoEn: { gte: hace90 } }, select: { tenantId: true, creadoEn: true } }),
  ]);

  const max = (filas: { tenantId: string; _max: { creadoEn: Date | null } }[]) =>
    new Map(filas.map(f => [f.tenantId, f._max.creadoEn]));
  const cuenta = (filas: { tenantId: string; _count: { _all: number } }[]) =>
    new Map(filas.map(f => [f.tenantId, f._count._all]));

  const mAud = max(ultAuditoria), mAct = max(ultActividad), mCot = max(ultCotizacion);
  const mEtapa = new Map<string, Date>();
  for (const c of ultCambioEtapa) {
    const t = c.oportunidad.tenantId;
    if (!mEtapa.has(t) || c.creadoEn > mEtapa.get(t)!) mEtapa.set(t, c.creadoEn);
  }
  const mCreado = new Map<string, Date>();
  const cNuevos = new Map<string, number>();
  const empresasPropias = sinCargasDeSoporte(empresasCreadas, marcasSoporte);
  const oportunidadesPropias = sinCargasDeSoporte(oportunidadesCreadas, marcasSoporte);
  for (const c of [...empresasPropias, ...oportunidadesPropias]) {
    if (!mCreado.has(c.tenantId) || c.creadoEn > mCreado.get(c.tenantId)!) mCreado.set(c.tenantId, c.creadoEn);
  }
  for (const o of oportunidadesPropias) {
    if (o.creadoEn >= hace30) cNuevos.set(o.tenantId, (cNuevos.get(o.tenantId) ?? 0) + 1);
  }
  const cAct7 = cuenta(act7), cAct30 = cuenta(act30), cAbiertas = cuenta(abiertas), cPaso = cuenta(conPaso);
  const cUsuarios = new Map<string, number>();
  for (const f of usuarios30) cUsuarios.set(f.tenantId, (cUsuarios.get(f.tenantId) ?? 0) + 1);

  const ids = new Set([...mAud.keys(), ...mAct.keys(), ...mEtapa.keys(), ...mCot.keys(), ...mCreado.keys(), ...cAbiertas.keys()]);
  const salud: Record<string, SaludUso> = {};
  for (const id of ids) {
    const ultimo = masReciente(mAud.get(id), mAct.get(id), mEtapa.get(id), mCot.get(id), mCreado.get(id));
    salud[id] = {
      ultimoUso: ultimo?.toISOString() ?? null,
      nivel: nivelDeUso(ultimo, ahora),
      usuariosActivos30d: cUsuarios.get(id) ?? 0,
      actividades7d: cAct7.get(id) ?? 0,
      actividades30d: cAct30.get(id) ?? 0,
      negociosNuevos30d: cNuevos.get(id) ?? 0,
      abiertas: cAbiertas.get(id) ?? 0,
      abiertasConProximoPaso: cPaso.get(id) ?? 0,
    };
  }
  return salud;
}

/** Valor por defecto para un tenant sin ningún movimiento. */
export const SALUD_VACIA: SaludUso = {
  ultimoUso: null, nivel: "INACTIVO", usuariosActivos30d: 0, actividades7d: 0, actividades30d: 0,
  negociosNuevos30d: 0, abiertas: 0, abiertasConProximoPaso: 0,
};
