"use client";

import { useState } from "react";
import {
  IconShieldCheck, IconAlertTriangle, IconAlertCircle, IconCircleCheck, IconSparkles,
  IconMessageCircleQuestion, IconDiamond, IconFlag, IconBulb,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { boton } from "@/components/ui/estilos";
import type { Chequeo, NivelChequeo, RevisionIA } from "@/lib/revision-propuesta";

type Resultado = { chequeos: Chequeo[]; ia: RevisionIA | null; iaMensaje: string | null };

const NIVEL: Record<NivelChequeo, { icon: Icon; clase: string }> = {
  alerta: { icon: IconAlertCircle, clase: "text-red-600" },
  aviso: { icon: IconAlertTriangle, clase: "text-amber-600" },
  ok: { icon: IconCircleCheck, clase: "text-emerald-600" },
};

const VEREDICTO: Record<RevisionIA["veredicto"], { texto: string; clase: string }> = {
  LISTA: { texto: "Lista para enviar", clase: "bg-emerald-100 text-emerald-800" },
  AJUSTAR: { texto: "Conviene ajustar antes de enviar", clase: "bg-amber-100 text-amber-800" },
  NO_ENVIAR: { texto: "No la envíe todavía", clase: "bg-red-100 text-red-800" },
};

const TIPO: Record<RevisionIA["observaciones"][number]["tipo"], Icon> = {
  objecion: IconMessageCircleQuestion,
  valor: IconDiamond,
  riesgo: IconFlag,
  mejora: IconBulb,
};

// Panel "Revisar propuesta" de la ficha de una cotización: chequeos fijos
// (margen, descuentos, vigencia, correo) más la lectura comercial con IA.
// Solo aconseja; no cambia la cotización.
export function RevisorPropuestaIA({ cotizacionId }: { cotizacionId: string }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function revisar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/ia/revisar-propuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudo revisar la propuesta.");
      else setResultado(d);
    } catch {
      setError("No se pudo revisar la propuesta. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const ia = resultado?.ia;
  const alertas = resultado?.chequeos.filter(c => c.nivel !== "ok").length ?? 0;

  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center">
          <IconShieldCheck size={22} stroke={1.75} className="text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-800">Revisar propuesta antes de enviar</h2>
          <p className="text-xs text-slate-500 mt-0.5">Margen, descuentos, vigencia y lo que el cliente ya le dijo. No cambia nada de la cotización.</p>
        </div>
        <button onClick={revisar} disabled={cargando} className={boton("primario", "sm", "shrink-0")}>
          <IconSparkles size={15} stroke={2} />
          {cargando ? "Revisando…" : resultado ? "Revisar de nuevo" : "Revisar propuesta"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {resultado && !error && (
        <div className="mt-4 space-y-4">
          {ia ? (
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${VEREDICTO[ia.veredicto].clase}`}>{VEREDICTO[ia.veredicto].texto}</span>
              <p className="mt-2 text-sm text-slate-700">{ia.resumen}</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-700">
              {alertas === 0 ? "Sin observaciones en los chequeos." : `${alertas} ${alertas === 1 ? "punto para revisar" : "puntos para revisar"}.`}
            </p>
          )}

          {resultado.chequeos.length > 0 && (
            <ul className="space-y-2">
              {resultado.chequeos.map((c, i) => {
                const { icon: Ic, clase } = NIVEL[c.nivel];
                return (
                  <li key={i} className="flex gap-2">
                    <Ic size={17} stroke={1.9} className={`${clase} shrink-0 mt-0.5`} />
                    <div className="text-sm">
                      <span className="font-semibold text-slate-800">{c.titulo}.</span>{" "}
                      <span className="text-slate-600">{c.detalle}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {ia && ia.observaciones.length > 0 && (
            <div className="rounded-xl bg-brand-50/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
                <IconSparkles size={13} stroke={2} /> Lectura comercial con IA
              </p>
              <ul className="space-y-2">
                {ia.observaciones.map((o, i) => {
                  const Ic = TIPO[o.tipo];
                  return (
                    <li key={i} className="flex gap-2">
                      <Ic size={17} stroke={1.75} className="text-brand-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <span className="font-semibold text-slate-800">{o.titulo}.</span>{" "}
                        <span className="text-slate-600">{o.detalle}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {resultado.iaMensaje && <p className="text-xs text-slate-500">{resultado.iaMensaje}</p>}
        </div>
      )}
    </div>
  );
}
