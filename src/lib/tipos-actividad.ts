import {
  IconPhone, IconUsers, IconCheck, IconMail, IconBriefcase, IconTool,
  type Icon,
} from "@tabler/icons-react";

// Definición única de los tipos de actividad de la agenda. Se comparte entre la
// página de Agenda y el formulario inline (contactos, cuentas, pipeline) para
// que etiquetas, íconos y colores no se desincronicen.
export type TipoActividadDef = {
  key: string;
  label: string;
  icon: Icon;
  dot: string;    // color del punto en el calendario
  emoji: string;  // usado en el selector compacto inline
  // Solo se ofrece en el vertical de teatros/alquileres (módulo funciones o
  // salones activo). Sigue existiendo en el enum para todos, pero no se muestra
  // en el selector de otros tenants.
  soloEspacios?: boolean;
};

export const TIPOS_ACTIVIDAD: TipoActividadDef[] = [
  { key: "TAREA",            label: "Tarea",            icon: IconCheck,     dot: "bg-slate-400",  emoji: "✅" },
  { key: "LLAMADA",          label: "Llamada",          icon: IconPhone,     dot: "bg-blue-500",   emoji: "📞" },
  { key: "REUNION",          label: "Reunión",          icon: IconUsers,     dot: "bg-violet-500", emoji: "🤝" },
  { key: "EMAIL",            label: "Email",            icon: IconMail,      dot: "bg-emerald-500", emoji: "✉️" },
  { key: "VISITA_COMERCIAL", label: "Visita comercial", icon: IconBriefcase, dot: "bg-amber-500",  emoji: "🏢", soloEspacios: true },
  { key: "VISITA_TECNICA",   label: "Visita técnica",   icon: IconTool,      dot: "bg-cyan-500",   emoji: "🔧", soloEspacios: true },
];

/** El tenant vende teatros/alquileres si tiene el módulo funciones o salones activo. */
export function esVerticalEspacios(modulos: unknown): boolean {
  if (!modulos || typeof modulos !== "object") return false;
  const m = modulos as Record<string, unknown>;
  return m.funciones === true || m.salones === true;
}

/** Tipos que se ofrecen en el selector según el vertical del tenant. */
export function tiposActividadVisibles(modulos: unknown): TipoActividadDef[] {
  const espacios = esVerticalEspacios(modulos);
  return TIPOS_ACTIVIDAD.filter((t) => !t.soloEspacios || espacios);
}

/** Busca la definición de un tipo por su key (para renderizar actividades ya guardadas). */
export function tipoActividadDef(key: string): TipoActividadDef | undefined {
  return TIPOS_ACTIVIDAD.find((t) => t.key === key);
}
