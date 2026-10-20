import type { TonoInsignia } from "@/components/ui/estilos";
import type { Indicador, Semaforo } from "./estados";

export const TONO_SEMAFORO: Record<Semaforo, { tono: TonoInsignia; label: string }> = {
  bien: { tono: "exito", label: "Bien" },
  atencion: { tono: "alerta", label: "Atención" },
  riesgo: { tono: "peligro", label: "Riesgo" },
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-09" → "sep 26". */
export function mesCorto(mes: string): string {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? m} ${a.slice(2)}`;
}

/** Pesos en millones, como se leen los estados financieros: "$118,4 M". */
export function millones(v: number): string {
  const n = (Math.abs(v) / 1_000_000).toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${v < 0 ? "–" : ""}$${n} M`;
}

/** Variación porcentual entre dos cifras ("+12%", "–3%"), o "—" sin base. */
export function variacion(actual: number, anterior: number): string {
  if (!anterior) return "—";
  const v = Math.round(((actual - anterior) / Math.abs(anterior)) * 100);
  return `${v > 0 ? "+" : v < 0 ? "–" : ""}${Math.abs(v)}%`;
}

export function valorIndicador(i: Indicador): string {
  if (i.valor === null) return "—";
  if (i.formato === "porcentaje") return `${Math.round(i.valor * 100)}%`;
  if (i.formato === "dias") return `${Math.round(i.valor)} días`;
  return `${i.valor.toFixed(2).replace(".", ",")} veces`;
}

/** "2026-10-05" → "5 oct" (día de calendario, sin zona horaria). */
export function diaCorto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${Number(d)} ${MESES[Number(m) - 1] ?? m}`;
}
