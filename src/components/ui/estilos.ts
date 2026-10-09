import { twMerge } from "tailwind-merge";

/**
 * Sistema de estilos base del CRM: una sola definición de cómo se ven los
 * botones, campos, tarjetas e insignias.
 *
 * Son funciones que devuelven clases (no componentes) para poder usarlas en
 * cualquier elemento — un <Link> que se ve como botón sigue siendo un link.
 * El último argumento son las clases propias del lugar (w-full, mt-2, flex…);
 * twMerge resuelve los choques a favor de ellas.
 */

type Extra = string | false | null | undefined;

export function cx(...clases: Extra[]): string {
  return twMerge(clases.filter(Boolean).join(" "));
}

// ── Botones ─────────────────────────────────────────────────────────────────

export type VarianteBoton = "primario" | "marca" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton = "sm" | "md" | "lg";

const BOTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1";

const BOTON_VARIANTE: Record<VarianteBoton, string> = {
  // Acción principal de la pantalla (rojo ladrillo de la marca).
  primario: "bg-accent-600 text-white hover:bg-accent-700",
  // Acción importante pero no la principal (azul de la marca).
  marca: "bg-brand-600 text-white hover:bg-brand-700",
  secundario: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  fantasma: "text-slate-600 hover:bg-slate-100",
  peligro: "bg-red-600 text-white hover:bg-red-700",
};

const BOTON_TAMANO: Record<TamanoBoton, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm font-semibold",
};

export function boton(variante: VarianteBoton = "primario", tamano: TamanoBoton = "md", extra?: Extra): string {
  return cx(BOTON_BASE, BOTON_VARIANTE[variante], BOTON_TAMANO[tamano], extra);
}

// ── Campos (input, select, textarea) ────────────────────────────────────────

export type TamanoCampo = "sm" | "md";

const CAMPO_BASE =
  "rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 outline-none transition-colors " +
  "focus:border-brand-500 focus:ring-2 focus:ring-brand-100 " +
  "disabled:bg-slate-50 disabled:text-slate-400";

const CAMPO_TAMANO: Record<TamanoCampo, string> = {
  sm: "rounded-lg px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
};

export function campo(tamano: TamanoCampo = "md", extra?: Extra): string {
  return cx(CAMPO_BASE, CAMPO_TAMANO[tamano], extra);
}

// ── Tarjetas ────────────────────────────────────────────────────────────────

export function tarjeta(extra?: Extra): string {
  return cx("bg-white rounded-2xl border border-slate-200/80 shadow-sm", extra);
}

// ── Insignias ───────────────────────────────────────────────────────────────

export type TonoInsignia = "neutro" | "marca" | "exito" | "alerta" | "peligro" | "info";

const INSIGNIA_TONO: Record<TonoInsignia, string> = {
  neutro: "bg-slate-100 text-slate-600",
  marca: "bg-brand-50 text-brand-700",
  exito: "bg-emerald-50 text-emerald-700",
  alerta: "bg-amber-50 text-amber-700",
  peligro: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-700",
};

export function insignia(tono: TonoInsignia = "neutro", extra?: Extra): string {
  return cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", INSIGNIA_TONO[tono], extra);
}
