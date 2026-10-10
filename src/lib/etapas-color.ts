// Colores de las etapas del pipeline: UNA sola definición para todo el CRM.
//
// Las etapas abiertas usan una escala de la marca (azul del logo), de claro a
// oscuro según el orden real del embudo: Prospecto → Calificado → Cotización
// (key PROPUESTA) → Negociación. Cuanto más oscuro, más cerca del cierre.
// Ganada es el único verde del sistema; Perdida va en gris, porque perder es
// un resultado y no una alarma (el rojo queda para lo vencido).
//
// Las clases van escritas completas (nada de `bg-${x}`) para que Tailwind las
// encuentre al compilar. El nombre visible de cada etapa lo configura cada
// tenant; el key y su color quedan fijos aquí.

export type EtapaKey = "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";

export type EstiloEtapa = {
  /** Barras, puntos y rellenos. */
  barra: string;
  /** Borde superior de la columna del tablero. */
  bordeSup: string;
  /** Insignia suave (fondo claro, texto oscuro). */
  insignia: string;
  /** Insignia o pastilla seleccionada (fondo fuerte). */
  fuerte: string;
  /** Pastilla de filtro sin seleccionar, con hover. */
  pastilla: string;
  /** Texto de la etapa sobre blanco. */
  texto: string;
  /** Fondo + texto para el ícono de un KPI. */
  iconoFondo: string;
  iconoTexto: string;
  /** Hex para gráficos SVG, PDF y correos (sin Tailwind). */
  hex: string;
};

export const ETAPA_ESTILO: Record<EtapaKey, EstiloEtapa> = {
  PROSPECTO: {
    barra: "bg-brand-200", bordeSup: "border-t-brand-200",
    insignia: "bg-brand-50 text-brand-700", fuerte: "bg-brand-300 text-brand-950",
    pastilla: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    texto: "text-brand-600", iconoFondo: "bg-brand-50", iconoTexto: "text-brand-500",
    hex: "#b3d9e8",
  },
  CALIFICADO: {
    barra: "bg-brand-400", bordeSup: "border-t-brand-400",
    insignia: "bg-brand-100 text-brand-800", fuerte: "bg-brand-500 text-white",
    pastilla: "bg-brand-100 text-brand-800 hover:bg-brand-200",
    texto: "text-brand-700", iconoFondo: "bg-brand-100", iconoTexto: "text-brand-600",
    hex: "#4fa3c2",
  },
  PROPUESTA: {
    barra: "bg-brand-600", bordeSup: "border-t-brand-600",
    insignia: "bg-brand-200 text-brand-900", fuerte: "bg-brand-700 text-white",
    pastilla: "bg-brand-200 text-brand-900 hover:bg-brand-300",
    texto: "text-brand-800", iconoFondo: "bg-brand-200", iconoTexto: "text-brand-800",
    hex: "#23708f",
  },
  NEGOCIACION: {
    barra: "bg-brand-800", bordeSup: "border-t-brand-800",
    insignia: "bg-brand-800 text-white", fuerte: "bg-brand-900 text-white",
    pastilla: "bg-brand-800 text-white hover:bg-brand-900",
    texto: "text-brand-900", iconoFondo: "bg-brand-800", iconoTexto: "text-white",
    hex: "#174155",
  },
  GANADA: {
    barra: "bg-emerald-500", bordeSup: "border-t-emerald-500",
    insignia: "bg-emerald-50 text-emerald-700", fuerte: "bg-emerald-600 text-white",
    pastilla: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    texto: "text-emerald-700", iconoFondo: "bg-emerald-50", iconoTexto: "text-emerald-600",
    hex: "#10b981",
  },
  PERDIDA: {
    barra: "bg-slate-400", bordeSup: "border-t-slate-400",
    insignia: "bg-slate-100 text-slate-600", fuerte: "bg-slate-500 text-white",
    pastilla: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    texto: "text-slate-500", iconoFondo: "bg-slate-100", iconoTexto: "text-slate-500",
    hex: "#94a3b8",
  },
};

/** Estilo de una etapa; si el key no existe (dato viejo), cae en gris neutro. */
export function estiloEtapa(etapa: string): EstiloEtapa {
  return ETAPA_ESTILO[etapa as EtapaKey] ?? ETAPA_ESTILO.PERDIDA;
}

/** Atajo: un mapa key → una sola propiedad (ej. mapaEtapas("insignia")). */
export function mapaEtapas<K extends keyof EstiloEtapa>(prop: K): Record<string, EstiloEtapa[K]> {
  return Object.fromEntries(Object.entries(ETAPA_ESTILO).map(([k, v]) => [k, v[prop]]));
}
