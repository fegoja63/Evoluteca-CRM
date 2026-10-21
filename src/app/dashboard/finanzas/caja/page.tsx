import Link from "next/link";
import { accesoPaginaFinanzas, cargarDatosCaja } from "@/lib/finanzas/datos";
import { alertaCaja, ESTILO_ALERTA } from "@/lib/finanzas/alerta-caja";
import { puntoEquilibrio, diasEntre, equilibrioDelMes } from "@/lib/finanzas/caja";
import { millones, mesCorto, diaCorto } from "@/lib/finanzas/formato";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { GraficaCaja } from "@/components/finanzas/grafica-caja";
import { FormSupuestos } from "@/components/finanzas/form-supuestos";
import { SimuladorCaja } from "@/components/finanzas/simulador-caja";
import { RescateCaja } from "@/components/finanzas/rescate-caja";
import { CalendarioSalidas } from "@/components/finanzas/calendario-salidas";

export const dynamic = "force-dynamic";

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ forzar?: string }> }) {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const d = await cargarDatosCaja(acceso.tenantId);
  // "Simular estos cierres" llega con los negocios a marcar como cerrados.
  const forzar = ((await searchParams).forzar ?? "").split(",").filter(Boolean);

  if (!d.balance) {
    return (
      <MarcoFinanzas licencia={acceso.licencia}>
        <div className={tarjeta("p-6 text-sm text-slate-600")}>
          La caja proyectada arranca con la caja del último balance. Cargue el balance general para verla.{" "}
          {!acceso.soloLectura && <Link href="/dashboard/finanzas/cargar#balance" className={boton("primario", "sm", "ml-2")}>Cargar el balance</Link>}
        </div>
      </MarcoFinanzas>
    );
  }

  const alerta = alertaCaja({ hoy: d.hoy, caja: d.balance.caja, cartera: d.balance.cuentasPorCobrar, supuestos: d.supuestos, pipeline: d.pipeline });
  const pe = puntoEquilibrio(d.periodos);
  const conPipeline = d.pipeline.length > 0 || (d.supuestos.ventasProyectadas?.length ?? 0) > 0;
  const antiguedad = diasEntre(d.balance.corte, d.hoy);
  // Los negocios del pipeline que más plata traen en estas 13 semanas.
  const negocios = alerta.conNegocios.eventos.filter(e => e.tipo === "pipeline").sort((a, b) => b.monto - a.monto).slice(0, 5);

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <div className={cn("rounded-xl border px-4 py-3", ESTILO_ALERTA[alerta.nivel])}>
        <p className="text-base font-semibold">{alerta.titulo}</p>
        <p className="mt-1 text-sm">{alerta.detalle}</p>
        {alerta.rescate && <RescateCaja rescate={alerta.rescate} />}
      </div>
      {antiguedad > 45 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          La caja de partida es la del balance al {formatoDia(d.balance.corte)} ({antiguedad} días atrás). Actualice el balance para que la proyección sea confiable.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Caja de partida" valor={millones(d.balance.caja)} detalle={`Balance al ${formatoDia(d.balance.corte)}`} />
        <Kpi titulo="Días de caja" valor={alerta.diasCaja === null ? "—" : `${alerta.diasCaja} días`}
          detalle={alerta.diasCaja === null ? "Complete los supuestos" : "Si no entrara un peso más"} rojo={alerta.diasCaja !== null && alerta.diasCaja < 30} />
        <Kpi titulo="Punto más bajo" valor={millones(alerta.conNegocios.minimo.saldo)} detalle={`El ${diaCorto(alerta.conNegocios.minimo.dia)}`}
          rojo={alerta.conNegocios.minimo.saldo < 0} />
        <Kpi titulo="Punto de equilibrio" valor={pe ? `${millones(pe.ventasNecesarias)}/mes` : "—"}
          detalle={pe ? `Vendió ${millones(pe.ventasUltimoMes)} en ${mesCorto(pe.mesUltimo)} (${pe.ventasUltimoMes >= pe.ventasNecesarias ? "lo cubre" : "no lo cubre"})` : "Faltan resultados"}
          rojo={!!pe && pe.ventasUltimoMes < pe.ventasNecesarias} />
      </div>

      <div className={tarjeta("p-5")}>
        <h2 className="text-base font-semibold text-slate-800">Saldo de caja, próximas 13 semanas</h2>
        <div className="mt-3"><GraficaCaja con={alerta.conNegocios.semanas} sin={alerta.sinNegocios.semanas} conPipeline={conPipeline} /></div>
        <p className="mt-2 text-xs text-slate-500">
          Entradas: cartera del balance (repartida en {Math.max(7, d.supuestos.diasCobro)} días), ventas de contado, contratos vigentes
          {conPipeline ? " y los negocios del pipeline (valor × probabilidad, cobrados " + d.supuestos.diasCobro + " días después del cierre; incluyen IVA)" : ""}.
          Salidas: nómina, gastos fijos, créditos, proveedores, impuestos y prestaciones de ley estimadas. Es una proyección con supuestos, no contabilidad.
        </p>
      </div>

      <SimuladorCaja key={forzar.join(",")} hoy={d.hoy} caja={d.balance.caja} cartera={d.balance.cuentasPorCobrar} supuestos={d.supuestos} pipeline={d.pipeline} forzadosIniciales={forzar} />

      {pe && (() => {
        // Sin CRM, lo que se espera vender este mes ocupa el lugar del pipeline.
        const em = equilibrioDelMes(pe, d.hoy, d.ganadoMes, d.pipeline);
        const proyectadoMes = d.supuestos.ventasProyectadas?.find(v => v.mes === em.mes)?.monto ?? 0;
        const porEntrar = d.soloFinanzas ? proyectadoMes : em.pipelineDelMes;
        const falta = Math.max(0, em.necesario - em.vendido - porEntrar);
        const pct = (v: number) => `${Math.min(100, (v / em.necesario) * 100)}%`;
        return (
          <div className={tarjeta("p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-800">Punto de equilibrio de {mesCorto(em.mes)}</h2>
              <span className={insignia(falta > 0 ? "alerta" : "exito")}>{falta > 0 ? `Faltan ${millones(falta)}` : "Cubierto"}</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {millones(em.necesario)} <span className="text-sm font-normal text-slate-500">en ventas para cubrir gastos fijos de {millones(pe.gastosFijos)}</span>
            </p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img"
              aria-label={`Vendido ${millones(em.vendido)}, por entrar ${millones(porEntrar)}, de ${millones(em.necesario)}`}>
              <div className="h-full bg-brand-600" style={{ width: pct(em.vendido) }} />
              <div className="h-full bg-brand-300" style={{ width: pct(Math.min(porEntrar, Math.max(0, em.necesario - em.vendido))) }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
              {!d.soloFinanzas && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Ganado este mes: {millones(em.vendido)}</span>}
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-300" />
                {d.soloFinanzas ? `Ventas proyectadas del mes: ${millones(porEntrar)}` : `Pipeline del mes ponderado: ${millones(porEntrar)}`}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Margen de contribución de los últimos 3 meses: {Math.round(pe.margenContribucion * 100)}%. En {mesCorto(pe.mesUltimo)} vendió {millones(pe.ventasUltimoMes)} ({Math.round((pe.ventasUltimoMes / pe.ventasNecesarias) * 100)}% del punto de equilibrio).
            </p>
          </div>
        );
      })()}

      {negocios.length > 0 && (
        <div className={tarjeta("p-5")}>
          <h2 className="text-base font-semibold text-slate-800">Los negocios que más mueven la caja</h2>
          <p className="mt-1 text-xs text-slate-500">
            Del pipeline del CRM, lo que se espera cobrar en estas 13 semanas (ya ponderado por probabilidad).
            {negocios.some(n => n.concepto.endsWith("(cierre vencido)")) && " Los de cierre vencido se cuentan como si cerraran hoy: actualice su fecha en el Pipeline."}
          </p>
          <ul className="mt-3 divide-y divide-slate-100">
            {negocios.map(n => (
              <li key={`${n.concepto}-${n.dia}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="text-slate-700">{n.concepto}</span>
                <span className="tabular-nums text-slate-500">{millones(n.monto)} · entra hacia el {diaCorto(n.dia)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CalendarioSalidas eventos={alerta.conNegocios.eventos} nominaMensual={d.supuestos.nominaMensual} />

      <details className={tarjeta("p-5")}>
        <summary className="cursor-pointer text-base font-semibold text-slate-800">Detalle semana a semana</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Semana del</th>
                <th className="px-3 py-2 text-right font-semibold">Cobros</th>
                {conPipeline && <th className="px-3 py-2 text-right font-semibold">Pipeline</th>}
                <th className="px-3 py-2 text-right font-semibold">Pagos</th>
                <th className="px-3 py-2 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerta.conNegocios.semanas.map(w => (
                <tr key={w.inicio}>
                  <td className="whitespace-nowrap px-3 py-1.5">{diaCorto(w.inicio)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{millones(w.cobros)}</td>
                  {conPipeline && <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{millones(w.pipeline)}</td>}
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{millones(w.pagos)}</td>
                  <td className={cn("whitespace-nowrap px-3 py-1.5 text-right font-semibold tabular-nums", w.saldo < 0 && "text-red-600")}>{millones(w.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <div className={tarjeta("p-5 space-y-3")} id="supuestos">
        <h2 className="text-base font-semibold text-slate-800">Supuestos de la proyección</h2>
        <FormSupuestos supuestos={d.supuestos} guardados={d.supuestosGuardados} soloLectura={acceso.soloLectura} soloFinanzas={d.soloFinanzas} hoy={d.hoy} />
      </div>
    </MarcoFinanzas>
  );
}

function Kpi({ titulo, valor, detalle, rojo }: { titulo: string; valor: string; detalle: string; rojo?: boolean }) {
  return (
    <div className={tarjeta("p-4")}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", rojo ? "text-red-600" : "text-slate-900")}>{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
