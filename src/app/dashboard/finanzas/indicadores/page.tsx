import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { indicadores, type Indicador } from "@/lib/finanzas/estados";
import { valorIndicador, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import { insignia, tarjeta } from "@/components/ui/estilos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";

export const dynamic = "force-dynamic";

const GRUPOS: Indicador["grupo"][] = ["Liquidez", "Endeudamiento", "Rentabilidad", "Ciclo de caja"];

export default async function IndicadoresPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const { periodos, balance } = await cargarDatosFinancieros(acceso.tenantId);
  const todos = indicadores(periodos, balance);

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <p className="text-sm text-slate-600">
        Cada indicador con su semáforo y lo que significa en palabras simples. Usan los últimos 12 meses de resultados
        {balance ? " y el último balance cargado" : ""}. Los rangos son una guía general para pymes: cada sector tiene los suyos.
      </p>
      {GRUPOS.map(g => (
        <div key={g}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{g}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todos.filter(i => i.grupo === g).map(i => (
              <div key={i.clave} className={tarjeta("p-4")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{i.nombre}</p>
                  {i.semaforo && <span className={insignia(TONO_SEMAFORO[i.semaforo].tono)}>{TONO_SEMAFORO[i.semaforo].label}</span>}
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valorIndicador(i)}</p>
                <p className="mt-1 text-xs text-slate-500">{i.lectura}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </MarcoFinanzas>
  );
}
