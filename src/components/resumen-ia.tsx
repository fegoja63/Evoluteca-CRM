"use client";

import { useEffect, useState } from "react";
import { IconSparkles } from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

// Botón "Resumen con IA" para la ficha de un cliente. Llama al endpoint propio
// (POST /api/ia/resumen-cliente/[id]) que a su vez llama a Claude, y muestra el
// texto a medida que va llegando (streaming). Si la IA no está configurada en
// el servidor, muestra un aviso claro en vez de romperse.
export function ResumenIA({ empresaId }: { empresaId: string }) {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [uso, setUso] = useState<Uso | null>(null);

  async function cargarUso() {
    try {
      const res = await fetch("/api/ia/uso");
      if (res.ok) setUso(await res.json());
    } catch { /* silencioso */ }
  }
  useEffect(() => { cargarUso(); }, []);

  async function generar() {
    setCargando(true);
    setError("");
    setTexto("");
    setAbierto(true);
    try {
      const res = await fetch(`/api/ia/resumen-cliente/${empresaId}`, { method: "POST" });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo generar el resumen.");
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
      setError("No se pudo generar el resumen. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
      cargarUso();
    }
  }

  // Texto de consumo del mes: "12 / 100 este mes" o "12 este mes" (ilimitado).
  const usoTexto = uso && uso.iaConfigurada && uso.limite !== 0
    ? uso.limite == null
      ? `${uso.usados} este mes`
      : `${uso.usados} / ${uso.limite} este mes`
    : null;
  const sinPlan = uso?.limite === 0;
  const topeAlcanzado = uso?.limite != null && uso.limite > 0 && uso.usados >= uso.limite;

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-100/60 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-xl bg-brand-400/30 blur-md animate-pulse" aria-hidden />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-600/30">
              <IconSparkles size={22} stroke={1.75} className="text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Resumen con IA</h2>
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">IA</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Panorama, valor, oportunidades, señales, contactos y próximas acciones de la cuenta.
              {usoTexto && <span className="text-slate-400"> · {usoTexto}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={generar}
          disabled={cargando || sinPlan || topeAlcanzado}
          title={sinPlan ? "No incluido en tu plan" : topeAlcanzado ? "Alcanzaste tu límite del mes" : undefined}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:from-brand-700 hover:to-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconSparkles size={15} stroke={2} className="shrink-0" />
          <span>{cargando ? "Generando…" : sinPlan ? "No disponible" : topeAlcanzado ? "Límite alcanzado" : texto || error ? "Regenerar" : "Generar resumen"}</span>
        </button>
      </div>

      {abierto && (
        <div className="mt-4">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {renderResumen(texto)}
              {cargando && <span className="inline-block w-1.5 h-4 align-text-bottom bg-brand-400 animate-pulse ml-0.5" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Convierte los **títulos** en negrita real, sin depender de una librería de
// markdown (el modelo devuelve "**Estado de la relación** — ...").
function renderResumen(texto: string) {
  if (!texto) return null;
  return texto.split(/(\*\*[^*]+\*\*)/g).map((frag, i) =>
    frag.startsWith("**") && frag.endsWith("**")
      ? <strong key={i} className="text-slate-900">{frag.slice(2, -2)}</strong>
      : <span key={i}>{frag}</span>,
  );
}
