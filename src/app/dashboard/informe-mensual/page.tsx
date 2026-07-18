"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconSparkles, IconArrowLeft, IconCopy, IconCheck } from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

export default function InformeMensualPage() {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [uso, setUso] = useState<Uso | null>(null);

  async function cargarUso() {
    try {
      const r = await fetch("/api/ia/uso", { cache: "no-store" });
      if (r.ok) setUso(await r.json());
    } catch { /* silencioso */ }
  }
  useEffect(() => { cargarUso(); }, []);

  async function generar() {
    setCargando(true);
    setError("");
    setTexto("");
    setCopiado(false);
    try {
      const res = await fetch("/api/ia/informe-mensual", { method: "POST" });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo generar el informe.");
        setCargando(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setTexto(acumulado);
      }
    } catch {
      setError("No se pudo generar el informe. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
      cargarUso();
    }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* */ }
  }

  const usoTexto = uso && uso.iaConfigurada && uso.limite !== 0
    ? uso.limite == null ? `${uso.usados} este mes` : `${uso.usados} / ${uso.limite} este mes`
    : null;
  const sinPlan = uso?.limite === 0;
  const topeAlcanzado = uso?.limite != null && uso.limite > 0 && uso.usados >= uso.limite;

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/asistente-ia" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <IconArrowLeft size={16} stroke={1.75} /> Asistente IA
      </Link>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
              <IconSparkles size={26} stroke={1.75} className="text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900">Informe ejecutivo mensual</h1>
              {usoTexto && <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{usoTexto}</span>}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">Cierre del mes anterior con resultados, tendencias y recomendaciones, listo para la junta.</p>
          </div>
        </div>
        <button
          onClick={generar}
          disabled={cargando || sinPlan || topeAlcanzado}
          title={sinPlan ? "No incluido en tu plan" : topeAlcanzado ? "Alcanzaste tu límite del mes" : undefined}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconSparkles size={15} stroke={2} />
          {cargando ? "Generando…" : sinPlan ? "No disponible" : topeAlcanzado ? "Límite alcanzado" : texto ? "Regenerar" : "Generar informe"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {(texto || cargando) && !error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {renderTexto(texto)}
            {cargando && <span className="inline-block w-1.5 h-4 align-text-bottom bg-brand-400 animate-pulse ml-0.5" />}
          </div>
          {texto && !cargando && (
            <div className="mt-4 flex justify-end">
              <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {copiado ? <><IconCheck size={14} stroke={2} className="text-emerald-600" /> Copiado</> : <><IconCopy size={14} stroke={1.75} /> Copiar</>}
              </button>
            </div>
          )}
        </div>
      )}

      {!texto && !cargando && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">Genera el informe de cierre del mes anterior con un clic. Las cifras salen de tus datos reales.</p>
        </div>
      )}
    </div>
  );
}

function renderTexto(texto: string) {
  if (!texto) return null;
  return texto.split(/(\*\*[^*]+\*\*)/g).map((frag, i) =>
    frag.startsWith("**") && frag.endsWith("**")
      ? <strong key={i} className="text-slate-900">{frag.slice(2, -2)}</strong>
      : <span key={i}>{frag}</span>,
  );
}
