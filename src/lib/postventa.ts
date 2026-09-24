// Postventa (módulo opcional "postventa"): lo que pasa DESPUÉS de ganar un
// negocio — entregarlo, hacerle seguimiento y renovarlo.
//
// Un negocio GANADO entra al tablero de Postventa en ENTREGA al ganarse (si el
// módulo está activo) y avanza por las etapas fijas de abajo. Con una fecha de
// renovación, el CRM avisa DIAS_AVISO_RENOVACION días antes, y desde la ficha se
// crea la oportunidad de renovación: un negocio nuevo en el pipeline, ligado al
// original. Puro y sin consultas: lo usan las APIs, las pantallas y el correo.

import type { EtapaPostventa } from "@prisma/client";

export const MODULO_POSTVENTA = "postventa";
export const DIAS_AVISO_RENOVACION = 30;

// color/dot: chips y puntos; borde/badge: columnas del tablero, con el mismo
// estilo que las columnas del Pipeline (borde superior de color y contador).
export const ETAPAS_POSTVENTA: { key: EtapaPostventa; label: string; descripcion: string; color: string; dot: string; borde: string; badge: string }[] = [
  { key: "ENTREGA",     label: "Entrega",     descripcion: "Implementar o entregar lo vendido",       color: "text-blue-700 bg-blue-50",       dot: "bg-blue-400",    borde: "border-t-blue-400",    badge: "bg-blue-100 text-blue-700" },
  { key: "SEGUIMIENTO", label: "Seguimiento", descripcion: "Cliente activo: acompañar y cuidar",      color: "text-violet-700 bg-violet-50",   dot: "bg-violet-400",  borde: "border-t-violet-400",  badge: "bg-violet-100 text-violet-700" },
  { key: "RENOVACION",  label: "Renovación",  descripcion: "Se acerca la renovación: negociarla",     color: "text-amber-700 bg-amber-50",     dot: "bg-amber-400",   borde: "border-t-amber-400",   badge: "bg-amber-100 text-amber-700" },
  { key: "CERRADO",     label: "Cerrado",     descripcion: "Ciclo terminado (renovado o finalizado)", color: "text-emerald-700 bg-emerald-50", dot: "bg-emerald-400", borde: "border-t-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
];

export const ETAPA_POSTVENTA_LABEL: Record<EtapaPostventa, string> = Object.fromEntries(
  ETAPAS_POSTVENTA.map((e) => [e.key, e.label]),
) as Record<EtapaPostventa, string>;

export function esEtapaPostventa(v: unknown): v is EtapaPostventa {
  return typeof v === "string" && ETAPAS_POSTVENTA.some((e) => e.key === v);
}

const DIA_MS = 86_400_000;

export type EstadoRenovacion =
  | { tipo: "vencida"; dias: number } // la fecha ya pasó hace `dias` días
  | { tipo: "proxima"; dias: number } // faltan `dias` (≤ DIAS_AVISO_RENOVACION)
  | { tipo: "futura"; dias: number }; // falta más que el aviso

/** Cómo va la renovación de un negocio. null si no tiene fecha de renovación. */
export function estadoRenovacion(
  fechaRenovacion: string | Date | null | undefined,
  ahora: Date = new Date(),
): EstadoRenovacion | null {
  if (!fechaRenovacion) return null;
  const f = fechaRenovacion instanceof Date ? fechaRenovacion : new Date(fechaRenovacion);
  if (isNaN(f.getTime())) return null;
  const dias = Math.ceil((f.getTime() - ahora.getTime()) / DIA_MS);
  if (dias < 0) return { tipo: "vencida", dias: -dias };
  if (dias <= DIAS_AVISO_RENOVACION) return { tipo: "proxima", dias };
  return { tipo: "futura", dias };
}

/**
 * ¿Requiere atención por renovación? Tiene fecha vencida o dentro del aviso, el
 * ciclo no está cerrado y todavía no se creó su oportunidad de renovación.
 */
export function renovacionPendiente(
  o: { fechaRenovacion?: string | Date | null; postventaEtapa?: EtapaPostventa | null; tieneRenovacion?: boolean },
  ahora: Date = new Date(),
): boolean {
  if (!o.postventaEtapa || o.postventaEtapa === "CERRADO" || o.tieneRenovacion) return false;
  const e = estadoRenovacion(o.fechaRenovacion, ahora);
  return !!e && (e.tipo === "vencida" || e.tipo === "proxima");
}

/**
 * Datos extra al pasar un negocio a GANADA: si el módulo está activo y el
 * negocio aún no está en postventa, entra en ENTREGA. Se usa en todos los
 * caminos que ganan un negocio (cambio de etapa y cotización aceptada).
 */
export function datosPostventaAlGanar(
  moduloActivo: boolean,
  postventaEtapaActual: EtapaPostventa | null | undefined,
): { postventaEtapa?: EtapaPostventa } {
  return moduloActivo && !postventaEtapaActual ? { postventaEtapa: "ENTREGA" } : {};
}
