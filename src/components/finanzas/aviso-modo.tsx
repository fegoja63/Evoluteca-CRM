import { IconInfoCircle } from "@tabler/icons-react";
import { ACLARACION_MODO, type ModoAnalisis } from "@/lib/finanzas/modo";
import { cn } from "@/lib/cn";

/**
 * Aclara con qué datos se hizo el análisis: un cierre anual (año contra año,
 * utilidad real del contador, sin detalle mensual) o estados mensuales (mes a
 * mes, temporada y proyección; impuesto estimado si no viene). Los resultados
 * de uno y otro no son iguales, y el usuario debe saberlo.
 */
export function AvisoModo({ modo, className }: { modo: ModoAnalisis; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600", className)}>
      <IconInfoCircle size={15} className="mt-0.5 shrink-0 text-brand-600" />
      <span>{ACLARACION_MODO[modo]}</span>
    </p>
  );
}
