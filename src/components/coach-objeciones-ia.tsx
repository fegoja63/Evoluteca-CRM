"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMessageChatbot, IconSparkles, IconCopy, IconCheck } from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };
type ObjecionGuia = { id: string; objecion: string };

// Panel "Coach de objeciones con IA" para la ficha de una oportunidad. El
// vendedor elige una objeción de la guía del equipo (o escribe la del cliente)
// y la IA sugiere una respuesta a la medida del negocio. Comparte el cupo
// mensual de IA con las demás funciones.
export function CoachObjecionesIA({ oportunidadId }: { oportunidadId: string }) {
  const [guia, setGuia] = useState<ObjecionGuia[]>([]);
  const [objecion, setObjecion] = useState("");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [uso, setUso] = useState<Uso | null>(null);

  async function cargarUso() {
    try { const r = await fetch("/api/ia/uso", { cache: "no-store" }); if (r.ok) setUso(await r.json()); } catch { /* silencioso */ }
  }
  useEffect(() => {
    cargarUso();
    fetch("/api/objeciones").then(r => r.ok ? r.json() : []).then((d: ObjecionGuia[]) => setGuia(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  async function generar() {
    if (objecion.trim().length < 2) { setError("Escribe o elige una objeción."); return; }
    setCargando(true); setError(""); setTexto(""); setCopiado(false);
    try {
      const res = await fetch("/api/ia/objecion-coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oportunidadId, objecion: objecion.trim() }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo generar la respuesta."); setCargando(false); return;
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
      setError("No se pudo generar la respuesta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false); cargarUso();
    }
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sin portapapeles */ }
  }

  const usoTexto = uso && uso.iaConfigurada && uso.limite !== 0
    ? uso.limite == null ? `${uso.usados} este mes` : `${uso.usados} / ${uso.limite} este mes`
    : null;
  const sinPlan = uso?.limite === 0;
  const topeAlcanzado = uso?.limite != null && uso.limite > 0 && uso.usados >= uso.limite;
  const bloqueado = cargando || sinPlan || topeAlcanzado;

  return (
    <div className="mb-5 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
            <IconMessageChatbot size={22} stroke={1.75} className="text-white" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800">Coach de objeciones con IA</h2>
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">IA</span>
            {usoTexto && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${topeAlcanzado ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-700"}`}>{usoTexto}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">¿El cliente puso una objeción? Elige una de tu guía o escríbela, y te sugiero cómo responder a la medida de este negocio.</p>
        </div>
      </div>

      {guia.length > 0 && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Elegir de la guía</label>
          <select
            value=""
            disabled={cargando}
            onChange={e => { if (e.target.value) setObjecion(e.target.value); }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="">— Selecciona una objeción de la guía —</option>
            {guia.map(g => <option key={g.id} value={g.objecion}>{g.objecion}</option>)}
          </select>
        </div>
      )}

      <div className="mt-3">
        <label className="block text-xs font-medium text-slate-600 mb-1">Objeción del cliente</label>
        <textarea
          value={objecion}
          onChange={e => setObjecion(e.target.value)}
          rows={2}
          disabled={cargando}
          placeholder='Ej: "Es muy caro" o lo que te dijo el cliente…'
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <div className="mt-3">
        <button
          onClick={generar}
          disabled={bloqueado}
          title={sinPlan ? "No incluido en tu plan" : topeAlcanzado ? "Alcanzaste tu límite del mes" : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconSparkles size={15} stroke={2} />
          {cargando ? "Pensando…" : texto ? "Regenerar" : "Sugerir respuesta"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {(texto || cargando) && !error && (
        <div className="mt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {texto || "…"}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={copiar}
              disabled={!texto || cargando}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              {copiado ? <><IconCheck size={14} stroke={2} className="text-emerald-600" /> Copiado</> : <><IconCopy size={14} stroke={1.75} /> Copiar</>}
            </button>
          </div>
        </div>
      )}

      {guia.length === 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Tip: arma tu <Link href="/dashboard/objeciones" className="text-brand-600 hover:underline">guía de objeciones</Link> para elegirlas con un clic.
        </p>
      )}
    </div>
  );
}
