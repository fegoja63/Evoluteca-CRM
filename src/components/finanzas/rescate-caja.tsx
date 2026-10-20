import Link from "next/link";
import { claveNegocio } from "@/lib/finanzas/caja";
import type { Rescate } from "@/lib/finanzas/simulador";
import { diaCorto, millones } from "@/lib/finanzas/formato";
import { boton } from "@/components/ui/estilos";

/**
 * Dentro de la alerta roja: qué negocios del pipeline, cerrados en su fecha,
 * evitan (o achican) el hueco de caja. Cada nombre abre la oportunidad, y el
 * botón los marca como cerrados en el simulador.
 */
export function RescateCaja({ rescate }: { rescate: Rescate }) {
  const n = rescate.negocios.length;
  const forzar = rescate.negocios.map(claveNegocio).join(",");
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm">
        {rescate.resuelve
          ? `Cerrar ${n === 1 ? "este negocio" : `estos ${n} negocios`} en la fecha prevista lo evita:`
          : `Cerrar ${n === 1 ? "este negocio" : `estos ${n} negocios`} reduce el hueco a ${millones(rescate.minimo.saldo)}:`}
      </p>
      <div className="flex flex-wrap gap-2">
        {rescate.negocios.map(neg => (
          <span key={claveNegocio(neg)} className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs text-slate-700">
            {neg.id ? <Link href={`/dashboard/pipeline/${neg.id}`} className="font-semibold hover:underline">{neg.titulo}</Link> : <b>{neg.titulo}</b>}
            {" · "}{millones(neg.valor)}{neg.etapa ? ` · ${neg.etapa.charAt(0) + neg.etapa.slice(1).toLowerCase()}` : ""} · cierre {diaCorto(neg.fechaCierre)}
          </span>
        ))}
      </div>
      <Link href={`/dashboard/finanzas/caja?forzar=${encodeURIComponent(forzar)}#simulador`} className={boton("primario", "sm")}>
        Simular estos cierres
      </Link>
    </div>
  );
}
