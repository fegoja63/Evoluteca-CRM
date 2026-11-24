"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconFileAnalytics, IconDownload, IconSparkles } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { formatoFechaHora, formatoDia } from "@/lib/fecha-bogota";
import { millones, mesCorto, variacion, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import { CupoIA, avisarUsoIA } from "./cupo-ia";
import { PLAZOS, type CifrasInforme, type FilaResultados, type TextoInforme } from "@/lib/finanzas/informe";
import { ACLARACION_MODO } from "@/lib/finanzas/modo";

type Informe = { id: string; mes: string; creadoEn: string; cifras: CifrasInforme; texto: TextoInforme };

// Gerente Financiero › Informe: genera el informe de análisis del mes (1 acción
// de IA), lo muestra y lo descarga en PDF; guarda el historial mes a mes.
// Los informes viejos pueden no traer salud, proyección, riesgos ni plan por
// plazo: cada sección nueva se muestra solo si viene.
export function InformeFinanciero({ soloLectura }: { soloLectura: boolean }) {
  const [informes, setInformes] = useState<Informe[] | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetch("/api/finanzas/informe", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setInformes(d.informes ?? []); setElegido(d.informes?.[0]?.id ?? null); })
      .catch(() => setInformes([]));
  }, []);

  async function generar() {
    setGenerando(true);
    const res = await fetch("/api/finanzas/informe", { method: "POST" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setGenerando(false);
    if (!res?.ok) { toast.error(d?.error ?? "No se pudo generar el informe. Revise su conexión e inténtelo de nuevo."); return; }
    setInformes(prev => [d.informe, ...(prev ?? [])]);
    setElegido(d.informe.id);
    avisarUsoIA();
    toast.success("Informe listo. Puede descargarlo en PDF.");
  }

  const actual = informes?.find(i => i.id === elegido) ?? null;

  return (
    <div className="space-y-5">
      <section className={tarjeta("p-5")}>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <IconFileAnalytics size={20} stroke={1.75} className="text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800">Informe de análisis financiero</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Puntaje de salud financiera, hallazgo principal y decisiones urgentes; resultados contra el mes anterior y el año
              pasado, proyección al cierre del año, indicadores con semáforo, caja de 13 semanas, riesgos y oportunidades, plan de
              acción a 30-60-90 días y metas del próximo mes. Las cifras las calcula el sistema; la IA las analiza. Se descarga en
              PDF con gráficas para socios o junta.
            </p>
            {!soloLectura && <CupoIA className="mt-1.5" />}
          </div>
          {!soloLectura && (
            <button onClick={generar} disabled={generando} className={boton("primario", "md", "shrink-0")}>
              <IconSparkles size={16} stroke={2} />{generando ? "Generando… puede tardar un minuto" : "Generar informe del mes"}
            </button>
          )}
        </div>
        {informes && informes.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-xs font-semibold text-slate-500">Informes anteriores:</span>
            {informes.map(i => (
              <button key={i.id} onClick={() => setElegido(i.id)}
                className={i.id === elegido ? insignia("marca") : "rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50"}>
                {mesCorto(i.mes)} · {formatoFechaHora(i.creadoEn, { day: "numeric", month: "short" })}
              </button>
            ))}
          </div>
        )}
      </section>

      {informes === null ? (
        <div className={tarjeta("h-40 animate-pulse bg-slate-50")} />
      ) : !actual ? (
        <p className={tarjeta("p-5 text-sm text-slate-500")}>
          Todavía no hay informes. {soloLectura ? "" : "Pulse \"Generar informe del mes\" después de cargar sus estados financieros."}{" "}
          <Link href="/dashboard/finanzas/subir" className="font-semibold text-brand-700 hover:underline">Subir estados financieros</Link>
        </p>
      ) : (
        <VistaInforme informe={actual} />
      )}
    </div>
  );
}

function Parrafos({ xs }: { xs: string[] }) {
  return <>{xs.map((x, i) => <p key={i} className="mb-2 text-sm leading-relaxed text-slate-700">{x}</p>)}</>;
}

const colorSalud = (p: number) => (p >= 75 ? "text-emerald-600" : p >= 55 ? "text-blue-600" : p >= 35 ? "text-amber-600" : "text-red-600");
const barraSalud = (p: number) => (p >= 75 ? "bg-emerald-500" : p >= 55 ? "bg-blue-500" : p >= 35 ? "bg-amber-500" : "bg-red-500");

function Kpi({ etiqueta, valor, detalle, rojo }: { etiqueta: string; valor: string; detalle?: string; rojo?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${rojo ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
      {detalle && <p className="text-2xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function VistaInforme({ informe }: { informe: Informe }) {
  const { cifras: c, texto: t } = informe;
  const anual = c.modo === "anual";
  const impuestoReal = !!c.actual.impuestoReal;
  const conDetalle = anual || typeof c.actual.antesDeImpuestos === "number";
  const filas: [string, keyof FilaResultados][] = [
    ["Ventas", "ventas"], ["Utilidad bruta", "utilidadBruta"], ["EBITDA", "ebitda"],
    ...(conDetalle ? [
      ["Ingresos no operacionales", "otrosIngresos"], ["Gastos no operacionales", "otrosGastos"],
      ["Utilidad antes de impuestos", "antesDeImpuestos"], [impuestoReal ? "Impuesto de renta" : "Impuesto (est. 35 %)", "impuesto"],
    ] as [string, keyof FilaResultados][] : []),
    [impuestoReal ? "Utilidad neta" : "Utilidad neta (est.)", "utilidadNeta"],
  ];
  const valor = (f: FilaResultados | null, k: keyof FilaResultados) => (f && typeof f[k] === "number" ? (f[k] as number) : null);
  const p = c.proyeccion;
  const barras = [
    ...c.serie.slice(-6).map(f => ({ mes: f.mes, ventas: f.ventas, proyectado: false })),
    ...(p?.proximos ?? []).map(m => ({ mes: m.mes, ventas: m.ventas, proyectado: true })),
  ];
  const maxBarra = Math.max(1, ...barras.map(b => b.ventas));
  const plan = PLAZOS.map(plazo => ({ plazo, acciones: t.recomendaciones.filter(r => (r.plazo ?? "30 días") === plazo) })).filter(g => g.acciones.length);
  const riesgos = t.riesgos ?? [];
  const oportunidades = t.oportunidades ?? [];
  const metas = t.metasProximoMes ?? [];

  return (
    <article className={tarjeta("p-5 sm:p-6 space-y-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{anual ? `Cierre anual ${c.mes}` : `Mes analizado: ${mesCorto(c.mes)}`}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{t.titulo}</h3>
          <p className="text-xs text-slate-400">Generado el {formatoFechaHora(informe.creadoEn)}</p>
        </div>
        <a href={`/api/finanzas/informe/pdf?id=${informe.id}`} className={boton("secundario", "md")}>
          <IconDownload size={16} stroke={1.75} />Descargar PDF
        </a>
      </div>

      <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
        {c.salud && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 lg:pr-6">
            <p className={`text-4xl font-bold tabular-nums ${colorSalud(c.salud.puntaje)}`}>{c.salud.puntaje}</p>
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">Salud financiera</p>
              <p className={`text-sm font-bold ${colorSalud(c.salud.puntaje)}`}>{c.salud.etiqueta}</p>
              <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${barraSalud(c.salud.puntaje)}`} style={{ width: `${c.salud.puntaje}%` }} />
              </div>
              <p className="mt-1 text-2xs text-slate-500">{c.salud.bien} bien · {c.salud.atencion} atención · {c.salud.riesgo} riesgo</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi etiqueta={`Ventas ${mesCorto(c.mes)}`} valor={millones(c.actual.ventas)}
            detalle={c.anterior ? `${variacion(c.actual.ventas, c.anterior.ventas)} vs. ${anual ? c.anterior.mes : "mes anterior"}` : undefined} />
          <Kpi etiqueta={impuestoReal ? "Utilidad neta" : "Utilidad neta (est.)"} valor={millones(c.actual.utilidadNeta)} rojo={c.actual.utilidadNeta < 0}
            detalle={c.actual.ventas ? `${Math.round((c.actual.utilidadNeta / c.actual.ventas) * 100)}% de las ventas` : undefined} />
          <Kpi etiqueta="Caja" valor={c.balance ? millones(c.balance.caja) : "—"}
            detalle={c.balance ? `al ${formatoDia(c.balance.corte, { day: "numeric", month: "short" })}` : "sin balance"} />
          <Kpi etiqueta="Días de caja" valor={c.caja?.diasCaja != null ? String(c.caja.diasCaja) : "—"} detalle={c.caja?.titulo} rojo={c.caja?.nivel === "rojo"} />
        </div>
      </div>

      <div className="rounded-xl bg-brand-50 p-4">
        {t.hallazgoPrincipal && (
          <>
            <p className="text-2xs font-semibold uppercase tracking-wide text-brand-700">Hallazgo principal</p>
            <p className="mb-3 mt-0.5 text-base font-bold leading-snug text-brand-900">{t.hallazgoPrincipal}</p>
          </>
        )}
        <p className="text-sm leading-relaxed text-slate-800">{t.resumenEjecutivo}</p>
        {t.decisionesUrgentes.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm font-medium text-brand-900">
            {t.decisionesUrgentes.map((d, i) => <li key={i}>{d}</li>)}
          </ol>
        )}
      </div>

      <div className="space-y-1">
        <p className="border-l-2 border-slate-300 pl-2 text-xs text-slate-500">{ACLARACION_MODO[anual ? "anual" : "mensual"]}</p>
        {c.mesesDesdeDato != null && c.mesesDesdeDato > 3 && (
          <p className="border-l-2 border-amber-400 pl-2 text-xs text-amber-700">
            El último dato cargado es de {mesCorto(c.mes)}, hace {c.mesesDesdeDato} meses: las cifras y la caja de hoy pueden ser otras.
          </p>
        )}
      </div>

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">{anual ? `Resultados del año ${c.mes}` : "Resultados del mes"}</h4>
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-3 font-semibold">Concepto</th>
                <th className="py-1 pr-3 text-right font-semibold">{mesCorto(c.mes)}</th>
                <th className="py-1 pr-3 text-right font-semibold">{anual ? (c.anterior ? c.anterior.mes : "Año anterior") : "vs. mes anterior"}</th>
                <th className="py-1 text-right font-semibold">{anual ? "Variación" : "vs. año pasado"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(([n, k]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 text-slate-700">{n}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{valor(c.actual, k) != null ? millones(valor(c.actual, k)!) : "—"}</td>
                  {anual ? (
                    <>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">{valor(c.anterior, k) != null ? millones(valor(c.anterior, k)!) : "—"}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600">{valor(c.anterior, k) != null && valor(c.actual, k) != null ? variacion(valor(c.actual, k)!, valor(c.anterior, k)!) : "—"}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">{valor(c.anterior, k) != null && valor(c.actual, k) != null ? variacion(valor(c.actual, k)!, valor(c.anterior, k)!) : "—"}</td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600">{valor(c.anioAnterior, k) != null && valor(c.actual, k) != null ? variacion(valor(c.actual, k)!, valor(c.anioAnterior, k)!) : "—"}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Parrafos xs={t.resultados} />
      </section>

      {(c.queSiPasa?.length ?? 0) > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Qué pasa si…</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="py-1 pr-3 font-semibold">Palanca</th>
                  <th className="py-1 pr-3 text-right font-semibold">Cambio en la utilidad</th>
                  <th className="py-1 text-right font-semibold">Utilidad neta resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {c.queSiPasa!.map(q => (
                  <tr key={q.palanca}>
                    <td className="py-1.5 pr-3 text-slate-700">{q.palanca}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-emerald-700">+{millones(q.cambio)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${q.utilidadNeta < 0 ? "text-red-600" : "text-slate-800"}`}>{millones(q.utilidadNeta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-2xs text-slate-400">Cada palanca se mide por separado, con impuesto de renta estimado del 35 % sobre el cambio.</p>
        </section>
      )}

      {c.escenarios && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Escenarios {c.escenarios.anio}</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {c.escenarios.lista.map(e => (
              <div key={e.nombre} className={`rounded-xl border p-3 ${e.nombre === "Base" ? "border-brand-400" : "border-slate-200"}`}>
                <p className="text-2xs font-semibold uppercase tracking-wide text-slate-400">{e.nombre}</p>
                <p className={`mt-0.5 text-lg font-bold tabular-nums ${e.utilidadNeta < 0 ? "text-red-600" : "text-slate-900"}`}>{millones(e.utilidadNeta)}</p>
                <p className="text-2xs text-slate-500">utilidad neta · ventas {millones(e.ventas)} · EBITDA {millones(e.ebitda)}</p>
                <p className="mt-1 text-2xs text-slate-500">{e.supuesto}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 mt-1 text-2xs text-slate-400">Estimación del sistema a partir del último cierre; impuesto de renta estimado al 35 %. No reemplaza un presupuesto.</p>
          <Parrafos xs={t.proyeccion ?? []} />
        </section>
      )}

      {p && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Proyección</h4>
          <div className="flex h-28 items-end gap-1.5">
            {barras.map(b => (
              <div key={b.mes} className="flex h-full flex-1 flex-col justify-end" title={`${mesCorto(b.mes)}: ${millones(b.ventas)}`}>
                <div className={`w-full rounded-t ${b.proyectado ? "bg-brand-400/60" : "bg-slate-300"}`} style={{ height: `${(b.ventas / maxBarra) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mb-3 mt-1 flex gap-1.5">
            {barras.map(b => (
              <span key={b.mes} className={`flex-1 text-center text-2xs ${b.proyectado ? "font-semibold text-brand-700" : "text-slate-500"}`}>{mesCorto(b.mes)}</span>
            ))}
          </div>
          <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.proximos.map(m => (
              <Kpi key={m.mes} etiqueta={`${mesCorto(m.mes)} (est.)`} valor={millones(m.ventas)} detalle={`utilidad ${millones(m.utilidadNeta)}`} rojo={m.utilidadNeta < 0} />
            ))}
            {p.anio && (
              <Kpi etiqueta={`Cierre ${p.anio.anio} (est.)`} valor={millones(p.anio.ventasCierre)} detalle={`utilidad ${millones(p.anio.utilidadCierre)}`} rojo={p.anio.utilidadCierre < 0} />
            )}
          </div>
          <p className="mb-2 text-2xs text-slate-400">
            {p.metodo === "estacional"
              ? "Estimación del sistema: ventas del mismo mes del año pasado × el crecimiento de los últimos 3 meses."
              : "Estimación del sistema: promedio de ventas de los últimos 3 meses (falta historia del año pasado)."}
          </p>
          <Parrafos xs={t.proyeccion ?? []} />
        </section>
      )}

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">Balance e indicadores</h4>
        <div className="mb-3 flex flex-wrap gap-2">
          {c.indicadores.filter(i => i.semaforo).map(i => (
            <span key={i.nombre} className={insignia(TONO_SEMAFORO[i.semaforo!].tono)} title={i.lectura}>{i.nombre}: {i.valor}</span>
          ))}
        </div>
        <Parrafos xs={t.balanceIndicadores} />
      </section>

      {(c.caja || t.caja.length > 0) && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Caja de las próximas 13 semanas</h4>
          {c.caja && (
            <p className="mb-2 text-xs text-slate-500">
              {c.caja.titulo} · punto más bajo {millones(c.caja.minimo.saldo)} el {formatoDia(c.caja.minimo.dia)}
            </p>
          )}
          <Parrafos xs={t.caja} />
        </section>
      )}

      {t.clientes.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Rentabilidad por cliente</h4>
          <Parrafos xs={t.clientes} />
        </section>
      )}

      {(riesgos.length > 0 || oportunidades.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-red-100 bg-red-50/60 p-4">
            <h4 className="mb-2 text-sm font-bold text-red-700">Riesgos</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{riesgos.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
          <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <h4 className="mb-2 text-sm font-bold text-emerald-700">Oportunidades</h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{oportunidades.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </section>
        </div>
      )}

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">Plan de acción 30 · 60 · 90 días</h4>
        <div className="space-y-4">
          {plan.map(g => (
            <div key={g.plazo}>
              <span className={insignia("marca")}>Próximos {g.plazo}</span>
              <ol className="mt-2 space-y-3">
                {g.acciones.map((r, i) => (
                  <li key={i} className="border-l-4 border-brand-400 pl-3">
                    <p className="text-sm font-semibold text-slate-800">{r.accion}</p>
                    {(r.responsable || r.indicador) && (
                      <div className="my-1 flex flex-wrap gap-1.5">
                        {r.responsable && <span className={insignia("neutro")}>Responsable: {r.responsable}</span>}
                        {r.indicador && <span className={insignia("exito")}>Meta: {r.indicador}</span>}
                      </div>
                    )}
                    <p className="text-sm text-slate-600">Por qué: {r.porque}</p>
                    <p className="text-xs text-slate-500">Impacto esperado: {r.impacto}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {metas.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">{anual ? "Metas para el próximo reporte" : "Metas para el próximo mes"}</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 font-semibold">Indicador</th>
                <th className="py-1 text-right font-semibold">Hoy</th>
                <th className="py-1 text-right font-semibold">Meta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metas.map((m, i) => (
                <tr key={i}>
                  <td className="py-1.5 text-slate-700">{m.indicador}</td>
                  <td className="py-1.5 text-right tabular-nums">{m.actual}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-emerald-700">{m.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {t.preguntasContador.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Preguntas para el contador</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{t.preguntasContador.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}

      <p className="text-2xs text-slate-400">
        Cifras calculadas por el sistema a partir de los estados cargados ({impuestoReal ? "utilidad neta con el impuesto de renta que reportó el contador" : "utilidad neta con impuesto de renta estimado del 35%"}); las
        proyecciones son estimaciones. El análisis lo redacta la IA sobre esas cifras: no reemplaza la revisión del contador.
      </p>
    </article>
  );
}
