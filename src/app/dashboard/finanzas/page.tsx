import Link from "next/link";
import { IconChartLine, IconAlertTriangle, IconAdjustments, IconSparkles, IconUpload } from "@tabler/icons-react";
import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { estadoResultados, sumarPeriodos, ultimosMeses, indicadores } from "@/lib/finanzas/estados";
import { millones, mesCorto, variacion, valorIndicador, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";

export const dynamic = "force-dynamic";

// Lo que llega en las fases siguientes del módulo.
const PROXIMAS = [
  { icon: IconChartLine, titulo: "Caja proyectada", texto: "Cuánto dinero tendrá en las próximas semanas, con lo que se espera cobrar y pagar." },
  { icon: IconAlertTriangle, titulo: "Alerta de días de caja", texto: "Aviso a tiempo cuando la caja alcance para pocos días, y su punto de equilibrio." },
  { icon: IconAdjustments, titulo: "Simulador", texto: "Qué pasa si sube un costo, baja una venta o se demora un cobro." },
  { icon: IconSparkles, titulo: "Gerente con IA", texto: "Pregúntele por sus números y reciba un informe claro, en lenguaje sencillo." },
];

export default async function FinanzasPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const { periodos, balance } = await cargarDatosFinancieros(acceso.tenantId);
  const meses = ultimosMeses(periodos, 12);
  const ultimo = meses.length ? estadoResultados(meses[meses.length - 1]) : null;
  const anterior = meses.length > 1 ? estadoResultados(meses[meses.length - 2]) : null;
  const anio = estadoResultados(sumarPeriodos(meses));
  const enRiesgo = indicadores(periodos, balance).filter(i => i.semaforo === "riesgo" || i.semaforo === "atencion")
    .sort((a, b) => (a.semaforo === "riesgo" ? 0 : 1) - (b.semaforo === "riesgo" ? 0 : 1));

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      {!ultimo ? (
        <div className={tarjeta("p-6 text-center")}>
          <IconUpload size={28} stroke={1.75} className="mx-auto text-brand-600" />
          <p className="mt-2 text-base font-semibold text-slate-800">Cargue sus estados financieros para empezar</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
            Con el estado de resultados de los últimos meses y el balance, verá sus estados ordenados y sus indicadores con semáforo.
          </p>
          {!acceso.soloLectura && (
            <Link href="/dashboard/finanzas/cargar" className={boton("primario", "md", "mt-4")}>Cargar mis datos</Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo={`Ventas de ${mesCorto(ultimo.mes)}`} valor={millones(ultimo.ventas)}
              detalle={anterior ? `${variacion(ultimo.ventas, anterior.ventas)} vs. ${mesCorto(anterior.mes)}` : "Primer mes cargado"} />
            <Kpi titulo="Margen EBITDA del mes" valor={ultimo.ventas ? `${Math.round((ultimo.ebitda / ultimo.ventas) * 100)}%` : "—"}
              detalle={anio.ventas ? `${meses.length} meses: ${Math.round((anio.ebitda / anio.ventas) * 100)}%` : ""} />
            <Kpi titulo={`Utilidad neta, ${meses.length} meses`} valor={millones(anio.utilidadNeta)}
              detalle={anio.ventas ? `Margen neto ${Math.round((anio.utilidadNeta / anio.ventas) * 100)}%` : ""} />
            <Kpi titulo="Caja al corte" valor={balance ? millones(balance.caja) : "—"}
              detalle={balance ? `Balance al ${formatoDia(balance.corte)}` : "Cargue el balance"} />
          </div>

          <div className={tarjeta("p-5")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-800">Lo que conviene revisar</h2>
              <Link href="/dashboard/finanzas/indicadores" className="text-sm font-medium text-brand-700 hover:underline">Ver todos los indicadores</Link>
            </div>
            {enRiesgo.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                {balance ? "Todos los indicadores están en verde." : "Cargue el balance para ver liquidez, endeudamiento y ciclo de caja."}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {enRiesgo.slice(0, 4).map(i => (
                  <li key={i.clave} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{i.nombre}: {valorIndicador(i)}</p>
                      <p className="text-xs text-slate-500">{i.lectura}</p>
                    </div>
                    <span className={insignia(TONO_SEMAFORO[i.semaforo!].tono)}>{TONO_SEMAFORO[i.semaforo!].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Próximamente en el módulo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROXIMAS.map(f => (
            <div key={f.titulo} className={tarjeta("p-4")}>
              <f.icon size={20} stroke={1.75} className="text-brand-600" />
              <p className="mt-2 text-sm font-semibold text-slate-800">{f.titulo}</p>
              <p className="mt-1 text-xs text-slate-500">{f.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </MarcoFinanzas>
  );
}

function Kpi({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className={tarjeta("p-4")}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
