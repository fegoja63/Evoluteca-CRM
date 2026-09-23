// Estado comercial de una oportunidad: interpreta las señales que el CRM YA
// guarda (etapa, probabilidad, última señal de vida y fecha de cierre) en un
// único "estado real" con su porqué y una acción recomendada.
//
// Es DETERMINISTA y puro (sin IA y sin consultas a la base): la misma entrada
// siempre da la misma salida. Por eso es la única fuente de verdad — el Pipeline
// y el detalle lo importan para mostrar exactamente lo mismo, y es testeable.
//
// A propósito NO devuelve un número tipo "72%": un estado discreto que el
// vendedor puede verificar ("9 días sin contacto") sostiene más confianza que
// una probabilidad de dos dígitos inventada por una fórmula.

import type { TipoActividad } from "@prisma/client";
import { medianocheBogota } from "./fecha-bogota";

export type EstadoClave = "riesgo" | "atencion" | "alta" | "marcha";

export type EstadoComercial = {
  clave: EstadoClave;
  label: string;
  // Clases Tailwind. El lib no importa React ni JSX: solo devuelve strings, para
  // poder testearlo sin montar componentes.
  badge: string; // color del chip
  borde: string; // color del borde izquierdo de la tarjeta
  razon: string; // por qué está en este estado (verificable por el vendedor)
  accion: string; // qué hacer ahora
  accionTipo: TipoActividad; // tipo de tarea que crea el botón "Actuar"
};

// Señales mínimas que necesita el cálculo. El Pipeline ya recibe
// `ultimoMovimiento` de la API; el detalle lo deriva con `ultimoMovimientoDe`.
export type SenalesOportunidad = {
  etapa: string;
  probabilidad: number | null;
  ultimoMovimiento?: string | Date | null;
  creadoEn: string | Date;
  fechaCierre?: string | Date | null;
  // ¿Tiene al menos una actividad pendiente agendada de hoy en adelante? Es la
  // regla "sin siguiente paso, no hay oportunidad". `undefined` = el llamador no
  // cargó el dato, y la regla simplemente no se evalúa (compatibilidad).
  tieneProximoPaso?: boolean;
};

const DIA_MS = 86_400_000;
const ETAPAS_AVANZADAS = ["PROPUESTA", "NEGOCIACION"];
// Umbral de probabilidad para considerar "alta intención".
const PROB_ALTA = 70;

function aFecha(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function plural(n: number, sing: string, plur: string): string {
  return `${n} ${n === 1 ? sing : plur}`;
}

// Última señal de vida = la más reciente entre la última actividad, el último
// cambio de etapa, el último correo (entrante o saliente) y la creación.
// Reproduce el cálculo de la API de oportunidades (conUltimoMovimiento), para que
// el detalle —que tiene los arrays crudos— y el Pipeline —que ya recibe la fecha
// calculada— coincidan.
//
// Los correos cuentan como señal: si el cliente respondió (o se le escribió) hace
// poco, el negocio NO está estancado aunque el vendedor no haya registrado una
// actividad. Así el estado detecta interés real, no solo lo que se anota a mano.
//
// Solo cuentan actividades que YA ocurrieron (fecha ≤ ahora): una tarea agendada
// a futuro no es contacto con el cliente y no debe "resetear" los días sin
// movimiento. Las consultas del servidor aplican el mismo filtro.
export function ultimoMovimientoDe(o: {
  creadoEn: string | Date;
  actividades?: { fecha: string | Date }[];
  cambiosEtapa?: { creadoEn: string | Date }[];
  correos?: { fecha: string | Date }[];
}, ahora: Date = new Date()): Date {
  const base = aFecha(o.creadoEn) ?? new Date();
  const candidatos = [
    base,
    ...(o.actividades ?? []).map((a) => aFecha(a.fecha)).filter((d) => !!d && d <= ahora),
    ...(o.cambiosEtapa ?? []).map((c) => aFecha(c.creadoEn)),
    ...(o.correos ?? []).map((c) => aFecha(c.fecha)),
  ].filter((d): d is Date => !!d);
  return candidatos.reduce((a, b) => (b > a ? b : a), base);
}

// "Próximo paso" = actividad NO completada con fecha desde el inicio de hoy
// (hora Bogotá) en adelante. Una tarea vencida de días anteriores no cuenta:
// el negocio necesita un paso nuevo con fecha. Lo usa el detalle, que tiene el
// array completo; las consultas del servidor filtran lo mismo con Prisma
// (`inicioProximoPaso` + `completada: false`).
export function inicioProximoPaso(ahora: Date = new Date()): Date {
  return medianocheBogota(0, ahora);
}
export function tieneProximoPasoDe(
  actividades: { fecha: string | Date; completada: boolean }[],
  ahora: Date = new Date(),
): boolean {
  const desde = inicioProximoPaso(ahora);
  return actividades.some((a) => {
    const f = aFecha(a.fecha);
    return !a.completada && !!f && f >= desde;
  });
}

const ROJO = { badge: "text-red-600 bg-red-50", borde: "border-l-4 border-l-red-400" };
const AMBAR = { badge: "text-amber-600 bg-amber-50", borde: "border-l-4 border-l-amber-400" };
const VERDE = { badge: "text-emerald-600 bg-emerald-50", borde: "border-l-4 border-l-emerald-400" };
const AZUL = { badge: "text-blue-600 bg-blue-50", borde: "border-l-4 border-l-blue-400" };

/**
 * Calcula el estado comercial de una oportunidad activa. Devuelve `null` para
 * negocios cerrados (GANADA/PERDIDA): ya se resolvieron, no hay nada que hacer.
 *
 * @param umbralEstancamiento días sin movimiento a partir de los cuales el
 *   negocio se considera estancado (Tenant.diasEstancamiento; default 14).
 */
export function estadoComercial(
  o: SenalesOportunidad,
  umbralEstancamiento: number,
  ahora: Date = new Date(),
): EstadoComercial | null {
  if (o.etapa === "GANADA" || o.etapa === "PERDIDA") return null;

  const umbral = umbralEstancamiento > 0 ? umbralEstancamiento : 14;
  const ref = aFecha(o.ultimoMovimiento) ?? aFecha(o.creadoEn) ?? ahora;
  const diasSinMov = Math.floor((ahora.getTime() - ref.getTime()) / DIA_MS);

  const cierre = aFecha(o.fechaCierre);
  const diasParaCierre = cierre ? Math.ceil((cierre.getTime() - ahora.getTime()) / DIA_MS) : null;

  const prob = o.probabilidad ?? 50;
  const etapaAvanzada = ETAPAS_AVANZADAS.includes(o.etapa);

  // 1) EN RIESGO — lo más urgente; manda sobre todo lo demás.
  if (diasSinMov >= umbral * 2) {
    return { clave: "riesgo", label: "En riesgo", ...ROJO,
      razon: `${plural(diasSinMov, "día", "días")} sin contacto`,
      accion: "Reactivar hoy", accionTipo: "LLAMADA" };
  }
  if (diasParaCierre !== null && diasParaCierre < 0) {
    return { clave: "riesgo", label: "En riesgo", ...ROJO,
      razon: `Cierre vencido hace ${plural(Math.abs(diasParaCierre), "día", "días")}`,
      accion: "Reactivar hoy", accionTipo: "LLAMADA" };
  }

  // 2) REQUIERE ATENCIÓN — estancada respecto al umbral, o cierre inminente.
  if (diasSinMov >= umbral) {
    return { clave: "atencion", label: "Requiere atención", ...AMBAR,
      razon: `${plural(diasSinMov, "día", "días")} sin contacto`,
      accion: "Hacer seguimiento hoy", accionTipo: "LLAMADA" };
  }
  if (diasParaCierre !== null && diasParaCierre >= 0 && diasParaCierre <= 7) {
    return { clave: "atencion", label: "Requiere atención", ...AMBAR,
      razon: diasParaCierre === 0 ? "La fecha de cierre es hoy" : `Cierra en ${plural(diasParaCierre, "día", "días")}`,
      accion: "Hacer seguimiento hoy", accionTipo: "LLAMADA" };
  }

  // 2b) SIN PRÓXIMO PASO — activa y con movimiento reciente, pero nadie agendó
  //     qué sigue. Manda incluso sobre "alta intención": un negocio caliente sin
  //     siguiente paso es justo el que se enfría sin que nadie lo note.
  if (o.tieneProximoPaso === false) {
    return { clave: "atencion", label: "Requiere atención", ...AMBAR,
      razon: "Sin próximo paso agendado",
      accion: "Agendar el próximo paso", accionTipo: "TAREA" };
  }

  // 3) ALTA INTENCIÓN — etapa avanzada + probabilidad alta (y, por descarte de
  //    los pasos anteriores, con movimiento reciente).
  if (etapaAvanzada && prob >= PROB_ALTA) {
    return { clave: "alta", label: "Alta intención", ...VERDE,
      razon: `En etapa avanzada con ${prob}% de probabilidad`,
      accion: "Empujar al cierre", accionTipo: "LLAMADA" };
  }

  // 4) EN MARCHA — activa y trabajada, sin alarmas ni cierre próximo.
  return { clave: "marcha", label: "En marcha", ...AZUL,
    razon: "Con actividad reciente",
    accion: "Mantener el ritmo", accionTipo: "TAREA" };
}
