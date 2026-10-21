import Link from "next/link";
import { IconUpload } from "@tabler/icons-react";
import { accesoPaginaFinanzas, cargarDatosCaja } from "@/lib/finanzas/datos";
import { alertaCaja, ESTILO_ALERTA } from "@/lib/finanzas/alerta-caja";
import { cn } from "@/lib/cn";
import { diasEntre } from "@/lib/finanzas/caja";
import { diaCorto } from "@/lib/finanzas/formato";
import { GerenteIA } from "@/components/finanzas/gerente-ia";
import { RescateCaja } from "@/components/finanzas/rescate-caja";
import { estadoResultados, sumarPeriodos, ultimosMeses, indicadores } from "@/lib/finanzas/estados";
import { millones, mesCorto, variacion, valorIndicador, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";

export const dynamic = "force-dynamic";


export default async function FinanzasPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const datos = await cargarDatosCaja(acceso.tenantId);
  const { periodos, balance } = datos;
  const alerta = balance
    ? alertaCaja({ hoy: datos.hoy, caja: balance.caja, cartera: balance.cuentasPorCobrar, carteraDetalle: datos.carteraDetalle, supuestos: datos.supuestos, pipeline: datos.pipeline })
    : null;
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
          {alerta && (
            <div className={cn("rounded-xl border px-4 py-3", ESTILO_ALERTA[alerta.nivel])}>
              <p className="text-base font-semibold">{alerta.titulo}</p>
              <p className="mt-1 text-sm">{alerta.detalle} <Link href="/dashboard/finanzas/caja" className="font-semibold underline">Ver la caja proyectada</Link></p>
              {alerta.rescate && <RescateCaja rescate={alerta.rescate} />}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo={`Ventas de ${mesCorto(ultimo.mes)}`} valor={millones(ultimo.ventas)}
              detalle={anterior ? `${variacion(ultimo.ventas, anterior.ventas)} vs. ${mesCorto(anterior.mes)}` : "Primer mes cargado"} />
            <Kpi titulo="Margen EBITDA del mes" valor={ultimo.ventas ? `${Math.round((ultimo.ebitda / ultimo.ventas) * 100)}%` : "—"}
              detalle={anio.ventas ? `${meses.length} meses: ${Math.round((anio.ebitda / anio.ventas) * 100)}%` : ""} />
            <Kpi titulo={`Utilidad neta, ${meses.length} meses`} valor={millones(anio.utilidadNeta)}
              detalle={anio.ventas ? `Margen neto ${Math.round((anio.utilidadNeta / anio.ventas) * 100)}%` : ""} />
            <Kpi titulo="Caja hoy" valor={balance ? millones(balance.caja) : "—"}
              detalle={!balance || !alerta ? "Cargue el balance"
                : alerta.conNegocios.primerDiaEnRojo ? `Alcanza ${diasEntre(datos.hoy, alerta.conNegocios.primerDiaEnRojo)} días, hasta el ${diaCorto(alerta.conNegocios.primerDiaEnRojo)}`
                : "Alcanza las 13 semanas"}
              rojo={!!alerta?.conNegocios.primerDiaEnRojo} />
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

      {ultimo && <GerenteIA soloLectura={acceso.soloLectura} compacto />}
    </MarcoFinanzas>
  );
}

function Kpi({ titulo, valor, detalle, rojo }: { titulo: string; valor: string; detalle: string; rojo?: boolean }) {
  return (
    <div className={tarjeta("p-4")}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      <p className={rojo ? "mt-0.5 text-xs font-semibold text-red-600" : "mt-0.5 text-xs text-slate-500"}>{detalle}</p>
    </div>
  );
}
