"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconFileAnalytics, IconDownload, IconSparkles } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, insignia, tarjeta } from "@/components/ui/estilos";
import { formatoFechaHora, formatoDia } from "@/lib/fecha-bogota";
import { millones, mesCorto, variacion, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import type { CifrasInforme, TextoInforme } from "@/lib/finanzas/informe";

type Informe = { id: string; mes: string; creadoEn: string; cifras: CifrasInforme; texto: TextoInforme };

// Gerente Financiero › Informe: genera el informe de análisis del mes (1 acción
// de IA), lo muestra y lo descarga en PDF; guarda el historial mes a mes.
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
              Resumen ejecutivo, resultados del mes contra el anterior y el año pasado, indicadores con semáforo, caja de las
              próximas 13 semanas, rentabilidad por cliente, recomendaciones y preguntas para el contador. Las cifras las calcula
              el sistema; la IA las analiza. Se descarga en PDF para socios o junta. Usa 1 acción de IA.
            </p>
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
          <Link href="/dashboard/finanzas/cargar" className="font-semibold text-brand-700 hover:underline">Cargar datos</Link>
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

function VistaInforme({ informe }: { informe: Informe }) {
  const { cifras: c, texto: t } = informe;
  const filas: [string, keyof typeof c.actual][] = [
    ["Ventas", "ventas"], ["Utilidad bruta", "utilidadBruta"], ["EBITDA", "ebitda"], ["Utilidad neta (est.)", "utilidadNeta"],
  ];
  return (
    <article className={tarjeta("p-5 sm:p-6 space-y-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mes analizado: {mesCorto(c.mes)}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{t.titulo}</h3>
          <p className="text-xs text-slate-400">Generado el {formatoFechaHora(informe.creadoEn)}</p>
        </div>
        <a href={`/api/finanzas/informe/pdf?id=${informe.id}`} className={boton("secundario", "md")}>
          <IconDownload size={16} stroke={1.75} />Descargar PDF
        </a>
      </div>

      <div className="rounded-xl bg-brand-50 p-4">
        <p className="text-sm leading-relaxed text-slate-800">{t.resumenEjecutivo}</p>
        {t.decisionesUrgentes.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm font-medium text-brand-900">
            {t.decisionesUrgentes.map((d, i) => <li key={i}>{d}</li>)}
          </ol>
        )}
      </div>

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">1. Resultados del mes</h4>
        <div className="mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1 pr-3 font-semibold">Concepto</th>
                <th className="py-1 pr-3 text-right font-semibold">{mesCorto(c.mes)}</th>
                <th className="py-1 pr-3 text-right font-semibold">vs. mes anterior</th>
                <th className="py-1 text-right font-semibold">vs. año pasado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map(([n, k]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-3 text-slate-700">{n}</td>
                  <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{millones(c.actual[k] as number)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-slate-600">{c.anterior ? variacion(c.actual[k] as number, c.anterior[k] as number) : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-600">{c.anioAnterior ? variacion(c.actual[k] as number, c.anioAnterior[k] as number) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Parrafos xs={t.resultados} />
      </section>

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">2. Balance e indicadores</h4>
        <div className="mb-3 flex flex-wrap gap-2">
          {c.indicadores.filter(i => i.semaforo).map(i => (
            <span key={i.nombre} className={insignia(TONO_SEMAFORO[i.semaforo!].tono)} title={i.lectura}>{i.nombre}: {i.valor}</span>
          ))}
        </div>
        <Parrafos xs={t.balanceIndicadores} />
      </section>

      {(c.caja || t.caja.length > 0) && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">3. Caja de las próximas 13 semanas</h4>
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
          <h4 className="mb-2 text-sm font-bold text-slate-800">4. Rentabilidad por cliente</h4>
          <Parrafos xs={t.clientes} />
        </section>
      )}

      <section>
        <h4 className="mb-2 text-sm font-bold text-slate-800">Recomendaciones</h4>
        <ol className="space-y-3">
          {t.recomendaciones.map((r, i) => (
            <li key={i} className="border-l-4 border-brand-400 pl-3">
              <p className="text-sm font-semibold text-slate-800">{i + 1}. {r.accion}</p>
              <p className="text-sm text-slate-600">Por qué: {r.porque}</p>
              <p className="text-xs text-slate-500">Impacto esperado: {r.impacto}</p>
            </li>
          ))}
        </ol>
      </section>

      {t.preguntasContador.length > 0 && (
        <section>
          <h4 className="mb-2 text-sm font-bold text-slate-800">Preguntas para el contador</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{t.preguntasContador.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </section>
      )}

      <p className="text-2xs text-slate-400">
        Cifras calculadas por el sistema a partir de los estados cargados (utilidad neta con impuesto de renta estimado del 35%).
        El análisis lo redacta la IA sobre esas cifras: no reemplaza la revisión del contador.
      </p>
    </article>
  );
}
