"use client";

import { useEffect, useState } from "react";
import { IconSparkles } from "@tabler/icons-react";

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

// Botón "Brief del pipeline con IA" para la pantalla de Pipeline. Llama al
// endpoint propio (POST /api/ia/resumen-pipeline) que agrega el pipeline del
// tenant (o del vendedor, según rol) y lo pasa a Claude, mostrando el texto a
// medida que llega (streaming). Comparte el cupo mensual con los Resúmenes de
// cliente (mismo contador de UsoIA / limiteResumenesIA).
export function ResumenPipelineIA() {
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
      const res = await fetch("/api/ia/resumen-pipeline", { method: "POST" });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "No se pudo generar el brief.");
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
      setError("No se pudo generar el brief. Revisa tu conexión e inténtalo de nuevo.");
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
    <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
            <IconSparkles size={18} stroke={1.75} className="text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Brief del pipeline con IA</h2>
            <p className="text-xs text-slate-500">
              Panorama, negocios calientes, riesgos y prioridades de la semana.
              {usoTexto && <span className="text-slate-400"> · {usoTexto}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={generar}
          disabled={cargando || sinPlan || topeAlcanzado}
          title={sinPlan ? "No incluido en tu plan" : topeAlcanzado ? "Alcanzaste tu límite del mes" : undefined}
          className="shrink-0 rounded-xl bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {cargando ? "Generando…" : sinPlan ? "No disponible" : topeAlcanzado ? "Límite alcanzado" : texto || error ? "Regenerar" : "Generar brief"}
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
// markdown (el modelo devuelve "**Panorama** — ...").
function renderResumen(texto: string) {
  if (!texto) return null;
  return texto.split(/(\*\*[^*]+\*\*)/g).map((frag, i) =>
    frag.startsWith("**") && frag.endsWith("**")
      ? <strong key={i} className="text-slate-900">{frag.slice(2, -2)}</strong>
      : <span key={i}>{frag}</span>,
  );
}
