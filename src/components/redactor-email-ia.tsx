"use client";

import { useEffect, useState } from "react";
import { IconSparkles, IconCopy, IconCheck } from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };
type Tipo = "ENVIO" | "SEGUIMIENTO" | "CIERRE";

const TIPOS: { key: Tipo; label: string }[] = [
  { key: "ENVIO", label: "Envío" },
  { key: "SEGUIMIENTO", label: "Seguimiento" },
  { key: "CIERRE", label: "Cierre" },
];

// Panel "Redactor de correos con IA" para la ficha de una cotización. Genera el
// borrador de un correo (envío, seguimiento o cierre) en streaming, editable y
// copiable. Comparte el cupo mensual con las demás funciones de IA.
export function RedactorEmailIA({ cotizacionId }: { cotizacionId: string }) {
  const [tipo, setTipo] = useState<Tipo>("ENVIO");
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
      const res = await fetch("/api/ia/redactar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacionId, tipo }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo redactar el correo.");
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
      setError("No se pudo redactar el correo. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
      cargarUso();
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles */ }
  }

  const usoTexto = uso && uso.iaConfigurada && uso.limite !== 0
    ? uso.limite == null ? `${uso.usados} este mes` : `${uso.usados} / ${uso.limite} este mes`
    : null;
  const sinPlan = uso?.limite === 0;
  const topeAlcanzado = uso?.limite != null && uso.limite > 0 && uso.usados >= uso.limite;
  const bloqueado = cargando || sinPlan || topeAlcanzado;

  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
            <IconSparkles size={22} stroke={1.75} className="text-white" />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-800">Redactor de correos con IA</h2>
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">IA</span>
            {usoTexto && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${topeAlcanzado ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-700"}`}>{usoTexto}</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Redacta el correo de esta cotización. Revísalo antes de enviar.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
          {TIPOS.map(t => (
            <button
              key={t.key}
              onClick={() => setTipo(t.key)}
              disabled={cargando}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tipo === t.key ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={generar}
          disabled={bloqueado}
          title={sinPlan ? "No incluido en tu plan" : topeAlcanzado ? "Alcanzaste tu límite del mes" : undefined}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconSparkles size={15} stroke={2} />
          {cargando ? "Redactando…" : texto ? "Regenerar" : "Redactar correo"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {(texto || cargando) && !error && (
        <div className="mt-4">
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            rows={Math.max(8, texto.split("\n").length + 1)}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 leading-relaxed outline-none focus:border-brand-400 whitespace-pre-wrap"
            placeholder="El correo aparecerá aquí…"
          />
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
    </div>
  );
}
