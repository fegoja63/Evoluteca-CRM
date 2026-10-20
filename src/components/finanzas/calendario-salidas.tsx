import { calendarioDeSalidas, type Evento } from "@/lib/finanzas/caja";
import { diaCorto, millones } from "@/lib/finanzas/formato";
import { tarjeta } from "@/components/ui/estilos";

/**
 * Las obligaciones de las próximas 13 semanas que no son de todas las semanas:
 * impuestos, IVA, prestaciones de ley y créditos, con fecha y monto. La nómina
 * quincenal va al final como recordatorio.
 */
export function CalendarioSalidas({ eventos, nominaMensual }: { eventos: Evento[]; nominaMensual: number }) {
  const salidas = calendarioDeSalidas(eventos);
  return (
    <div className={tarjeta("p-5")}>
      <h2 className="text-base font-semibold text-slate-800">Calendario de salidas</h2>
      <p className="mt-1 text-xs text-slate-500">
        Obligaciones incluidas en la proyección de las próximas 13 semanas. Las fechas de la DIAN dependen del último dígito del NIT; las prestaciones son estimadas sobre la nómina.
      </p>
      {salidas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No hay impuestos, prestaciones ni cuotas registradas en los supuestos.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {salidas.map(e => (
            <li key={`${e.dia}-${e.concepto}`} className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 py-2 text-sm">
              <span className="tabular-nums text-xs text-slate-500">{diaCorto(e.dia)}</span>
              <span className="text-slate-700">{e.concepto}</span>
              <span className="tabular-nums text-slate-900">{millones(-e.monto)}</span>
            </li>
          ))}
          {nominaMensual > 0 && (
            <li className="grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-3 py-2 text-sm">
              <span className="text-xs text-slate-500">15 y fin de mes</span>
              <span className="text-slate-700">Nómina quincenal</span>
              <span className="tabular-nums text-slate-900">{millones(nominaMensual / 2)}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
