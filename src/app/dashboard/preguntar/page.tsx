"use client";

import { useEffect, useState } from "react";
import { IconSparkles, IconSend, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";

type Punto = { label: string; value: number };
type Resultado = { titulo: string; chart: string; formato: "moneda" | "entero"; datos: Punto[]; resumen: string };
type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

const EJEMPLOS = [
  "Valor ganado por mes este año",
  "Pipeline abierto por etapa",
  "Cuántas oportunidades por segmento",
  "Valor ganado por vendedor",
];

const fmtMoneda = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const fmtEntero = (v: number) => new Intl.NumberFormat("es-CO").format(Math.round(v));

export default function PreguntarPage() {
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);

  async function cargarUso() {
    try {
      const r = await fetch("/api/ia/uso", { cache: "no-store" });
      if (r.ok) setUso(await r.json());
    } catch { /* silencioso */ }
  }
  useEffect(() => { cargarUso(); }, []);

  async function preguntar(texto?: string) {
    const q = (texto ?? pregunta).trim();
    if (!q || cargando) return;
    if (texto) setPregunta(texto);
    setCargando(true);
    setError("");
    setRes(null);
    try {
      const r = await fetch("/api/ia/preguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "No se pudo responder la pregunta."); return; }
      setRes(data);
    } catch {
      setError("No se pudo responder. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
      cargarUso();
    }
  }

  const usoTexto = uso && uso.iaConfigurada && uso.limite !== 0
    ? uso.limite == null ? `${uso.usados} este mes` : `${uso.usados} / ${uso.limite} este mes`
    : null;
  const fmt = (v: number) => (res?.formato === "moneda" ? fmtMoneda(v) : fmtEntero(v));
  const maxVal = res && res.datos.length ? Math.max(...res.datos.map(d => Math.abs(d.value)), 1) : 1;
  const esNumero = res && (res.chart === "numero" || res.datos.length === 1);

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/asistente-ia" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <IconArrowLeft size={16} stroke={1.75} /> Asistente IA
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-2xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
            <IconSparkles size={26} stroke={1.75} className="text-white" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900">Pregúntale a tus datos</h1>
            {usoTexto && (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{usoTexto}</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            Escribe una pregunta y la IA arma la consulta; las cifras salen de tus datos reales.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") preguntar(); }}
          placeholder="Ej: valor ganado por mes en 2026"
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={() => preguntar()}
          disabled={cargando || !pregunta.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconSend size={15} stroke={2} /> {cargando ? "Consultando…" : "Preguntar"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EJEMPLOS.map(e => (
          <button key={e} onClick={() => preguntar(e)} disabled={cargando}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-300 hover:text-brand-700 disabled:opacity-60">
            {e}
          </button>
        ))}
      </div>

      {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

      {res && !error && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">{res.titulo}</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">{res.resumen}</p>

          {res.datos.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos para esa pregunta.</p>
          ) : esNumero ? (
            <p className="text-4xl font-extrabold text-slate-900 tabular-nums">{fmt(res.datos[0].value)}</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {res.datos.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-slate-600" title={d.label}>{d.label}</span>
                  <div className="flex-1 h-6 rounded-md bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-brand-500 to-brand-600"
                      style={{ width: `${Math.max(2, Math.round((Math.abs(d.value) / maxVal) * 100))}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
