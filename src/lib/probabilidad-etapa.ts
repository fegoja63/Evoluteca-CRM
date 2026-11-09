/**
 * Probabilidad de cierre según la etapa del negocio.
 *
 * Cada etapa del pipeline tiene una probabilidad que el Administrador ajusta en
 * Configuración › Etapas del pipeline (EtapaPipeline.probabilidad; null = la de
 * fábrica). Al crear un negocio o moverlo de etapa toma la de su etapa; el
 * vendedor puede afinarla a mano después, y al volver a cambiar de etapa se
 * reemplaza por la de la etapa nueva. Ganada es siempre 100% y Perdida 0%.
 */
import type { PrismaClient, Prisma } from "@prisma/client";

export type EtapaOportunidad = "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";

export const PROBABILIDAD_ETAPA_DEFECTO: Record<EtapaOportunidad, number> = {
  PROSPECTO: 10,
  CALIFICADO: 20,
  PROPUESTA: 50,
  NEGOCIACION: 75,
  GANADA: 100,
  PERDIDA: 0,
};

/** Las etapas cerradas tienen probabilidad fija: no se configura ni se ajusta. */
export function esEtapaCerrada(etapa: string): boolean {
  return etapa === "GANADA" || etapa === "PERDIDA";
}

/** Probabilidad de una etapa, con la configurada por el tenant si la hay. */
export function probabilidadDeEtapa(etapa: string, configurada?: number | null): number {
  if (etapa === "GANADA") return 100;
  if (etapa === "PERDIDA") return 0;
  if (configurada != null) return configurada;
  return PROBABILIDAD_ETAPA_DEFECTO[etapa as EtapaOportunidad] ?? 50;
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Probabilidad de cada etapa para un tenant (para crear o mover varios negocios). */
export async function probabilidadesDelTenant(db: Db, tenantId: string): Promise<Record<string, number>> {
  const filas = await db.etapaPipeline.findMany({ where: { tenantId }, select: { key: true, probabilidad: true } });
  const configurada = new Map(filas.map(f => [f.key, f.probabilidad]));
  return Object.fromEntries(
    (Object.keys(PROBABILIDAD_ETAPA_DEFECTO) as EtapaOportunidad[]).map(e => [e, probabilidadDeEtapa(e, configurada.get(e))]),
  );
}

/** Probabilidad que corresponde a un negocio que entra a `etapa` en este tenant. */
export async function probabilidadPara(db: Db, tenantId: string, etapa: string): Promise<number> {
  if (esEtapaCerrada(etapa)) return probabilidadDeEtapa(etapa);
  const fila = await db.etapaPipeline.findFirst({ where: { tenantId, key: etapa }, select: { probabilidad: true } });
  return probabilidadDeEtapa(etapa, fila?.probabilidad);
}
