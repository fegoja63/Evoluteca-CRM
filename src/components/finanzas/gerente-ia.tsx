"use client";

import { useState } from "react";
import Link from "next/link";
import { IconSparkles, IconSend } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";

type Respuesta = { pregunta: string; titulo: string; parrafos: string[]; acciones: string[]; texto: string };

const SUGERIDAS = [
  "¿Me alcanza la caja para la prima de diciembre?",
  "¿Qué gasto debería revisar primero?",
  "¿Cómo puedo cobrar más rápido?",
  "¿Puedo contratar a una persona más?",
];

/** El gerente financiero con IA: diagnóstico del mes y preguntas sobre los números. */
/** `compacto` = el panel del Resumen: solo el diagnóstico del mes, con enlace al gerente completo. */
export function GerenteIA({ soloLectura, compacto = false }: { soloLectura: boolean; compacto?: boolean }) {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [pensando, setPensando] = useState(false);

  async function preguntar(texto?: string) {
    if (pensando) return;
    setPensando(true);
    // Las últimas 4 preguntas van como contexto, para poder repreguntar.
    const historial = respuestas.slice(-4).map(r => ({ pregunta: r.pregunta, respuesta: r.texto }));
    const res = await fetch("/api/finanzas/gerente-ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta: texto?.trim() || undefined, historial }),
    });
    const data = await res.json().catch(() => ({}));
    setPensando(false);
    if (!res.ok) { toast.error(data.error ?? "No se pudo responder. Inténtelo de nuevo."); return; }
    setRespuestas(prev => [...prev, data]);
    setPregunta("");
  }

  if (compacto) {
    const r = respuestas.at(-1);
    return (
      <div className={tarjeta("p-5 space-y-3")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800"><IconSparkles size={18} className="text-brand-600" />Diagnóstico del mes</h2>
            <p className="mt-1 text-xs text-slate-500">El gerente con IA lee sus estados, la caja y el pipeline, y le dice qué está pasando, por qué y qué hacer.</p>
          </div>
          {!soloLectura && (
            <button type="button" onClick={() => preguntar()} disabled={pensando} className={boton("primario", "sm")}>
              {pensando ? "Analizando…" : r ? "Actualizar" : "Generar con IA"}
            </button>
          )}
        </div>
        {r && (
          <>
            <h3 className="text-sm font-semibold text-slate-900">{r.titulo}</h3>
            {r.parrafos.slice(0, 2).map((p, j) => <p key={j} className="text-sm leading-relaxed text-slate-700">{p}</p>)}
            {r.acciones.length > 0 && (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">{r.acciones.map((a, j) => <li key={j}>{a}</li>)}</ol>
            )}
          </>
        )}
        <Link href="/dashboard/finanzas/gerente" className="inline-block text-sm font-medium text-brand-700 hover:underline">Hacerle una pregunta al gerente →</Link>
      </div>
    );
  }

  if (soloLectura) {
    return (
      <div className={tarjeta("p-5 text-sm text-slate-600")}>
        Con la licencia vencida no se pueden hacer consultas nuevas al gerente con IA. Renuévela para seguir usándolo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={tarjeta("p-5 space-y-3")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <IconSparkles size={18} className="text-brand-600" />Pregúntele a sus números
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Responde con sus estados financieros, indicadores, caja proyectada y pipeline. Cada consulta cuenta como una acción de IA de su plan.
            </p>
          </div>
          <button type="button" onClick={() => preguntar()} disabled={pensando} className={boton("primario", "sm")}>
            {pensando && respuestas.length === 0 ? "Analizando…" : "Diagnóstico del mes"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGERIDAS.map(s => (
            <button key={s} type="button" disabled={pensando} onClick={() => preguntar(s)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-brand-700 transition-colors hover:border-brand-400 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); if (pregunta.trim()) preguntar(pregunta); }} className="flex gap-2">
          <input value={pregunta} onChange={e => setPregunta(e.target.value)} maxLength={500} disabled={pensando}
            placeholder="Escriba su pregunta…" className={campo("md", "min-w-0 flex-1")} aria-label="Pregunta para el gerente con IA" />
          <button type="submit" disabled={pensando || !pregunta.trim()} className={boton("marca", "md")}>
            <IconSend size={16} />{pensando ? "Pensando…" : "Preguntar"}
          </button>
        </form>
      </div>

      {[...respuestas].reverse().map((r, i) => (
        <div key={respuestas.length - i} className={tarjeta("p-5 space-y-3")}>
          <p className="text-xs text-slate-400">{r.pregunta}</p>
          <h3 className="text-base font-semibold text-slate-900">{r.titulo}</h3>
          {r.parrafos.map((p, j) => <p key={j} className="text-sm leading-relaxed text-slate-700">{p}</p>)}
          {r.acciones.length > 0 && (
            <div className="rounded-xl bg-brand-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Qué hacer</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {r.acciones.map((a, j) => <li key={j}>{a}</li>)}
              </ol>
            </div>
          )}
        </div>
      ))}

      <p className="text-xs text-slate-400">
        El gerente con IA analiza las cifras que usted cargó. Es una herramienta de apoyo: no reemplaza la asesoría contable, tributaria ni financiera certificada.
      </p>
    </div>
  );
}
