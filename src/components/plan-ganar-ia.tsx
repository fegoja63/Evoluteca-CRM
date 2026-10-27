"use client";

import { useState } from "react";
import { IconAlertTriangle, IconCalendarPlus, IconHelpCircle, IconMessage, IconSparkles, IconTarget } from "@tabler/icons-react";
import { boton, insignia, tarjeta, type TonoInsignia } from "@/components/ui/estilos";
import { AgendarPasoRapido } from "@/components/agendar-paso-rapido";
import { tipoActividadDef, type TipoActividadDef } from "@/lib/tipos-actividad";
import { CRITERIO_LABEL, NIVEL_LABEL, type PlanGanar } from "@/lib/plan-ganar";

type Paso = PlanGanar["proximosPasos"][number];

const TONO_NIVEL: Record<PlanGanar["calificacion"][number]["nivel"], TonoInsignia> = {
  ALTA: "exito", MEDIA: "alerta", BAJA: "peligro", SIN_DATOS: "neutro",
};

type Props = {
  oportunidad: { id: string; titulo: string; empresa: { id: string; nombre: string } | null; contacto: { id: string } | null };
  tipos: TipoActividadDef[];
  /** Tras agendar un paso, para que la ficha muestre la actividad nueva. */
  onAgendado: () => void;
};

// Tarjeta "Plan para ganar" de la ficha de una oportunidad abierta: la IA
// califica el negocio, señala los riesgos con la pregunta para aclararlos,
// propone qué decirle a cada decisor y los próximos pasos, que se agendan con
// un clic. Usa lo que el CRM ya sabe; el vendedor no pega nada.
export function PlanGanarIA({ oportunidad, tipos, onAgendado }: Props) {
  const [plan, setPlan] = useState<PlanGanar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [agendando, setAgendando] = useState<Paso | null>(null);
  const [agendados, setAgendados] = useState<Set<number>>(new Set());

  async function armar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/ia/plan-ganar/${oportunidad.id}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudo armar el plan.");
      else { setPlan(d.plan); setAgendados(new Set()); }
    } catch {
      setError("No se pudo armar el plan. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className={tarjeta("p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center">
          <IconTarget size={20} stroke={1.75} className="text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Plan para ganar</h2>
          <p className="text-xs text-slate-500 mt-0.5">Calificación, riesgos, qué decirle a cada decisor y próximos pasos, con lo que ya está en el CRM.</p>
        </div>
        <button onClick={armar} disabled={cargando} className={boton(plan ? "secundario" : "primario", "sm", "shrink-0")}>
          <IconSparkles size={14} stroke={2} />
          {cargando ? "Armando el plan…" : plan ? "Armar de nuevo" : "Armar plan con IA"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {plan && !error && (
        <div className="mt-4 space-y-5">
          {plan.lectura && <p className="text-sm text-slate-700">{plan.lectura}</p>}

          {plan.calificacion.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Calificación</h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {plan.calificacion.map(c => (
                  <li key={c.criterio} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
                    <div className="flex shrink-0 items-center gap-2 sm:w-56">
                      <span className="text-sm font-medium text-slate-800">{CRITERIO_LABEL[c.criterio]}</span>
                      <span className={insignia(TONO_NIVEL[c.nivel])}>{NIVEL_LABEL[c.nivel]}</span>
                    </div>
                    <p className="text-sm text-slate-600">{c.porque}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.riesgos.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Riesgos</h3>
              <ul className="space-y-2">
                {plan.riesgos.map((r, i) => (
                  <li key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="flex items-start gap-1.5 text-sm font-semibold text-amber-900">
                      <IconAlertTriangle size={16} stroke={1.75} className="mt-0.5 shrink-0" />{r.riesgo}
                    </p>
                    {r.senal && <p className="mt-1 text-xs text-amber-800">Señal: {r.senal}</p>}
                    {r.pregunta && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-700">
                        <IconHelpCircle size={15} stroke={1.75} className="mt-0.5 shrink-0 text-brand-600" />
                        <span><span className="font-medium">Pregúntele:</span> {r.pregunta}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(plan.propuestaValor || plan.mensajes.length > 0) && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Estrategia</h3>
              {plan.propuestaValor && (
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
                  <span className="font-semibold">Propuesta de valor:</span> {plan.propuestaValor}
                </p>
              )}
              {plan.mensajes.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {plan.mensajes.map((m, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                      <IconMessage size={15} stroke={1.75} className="mt-0.5 shrink-0 text-brand-600" />
                      <span><span className="font-semibold">{m.persona}:</span> {m.mensaje}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {plan.proximosPasos.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Próximos pasos</h3>
              <ul className="space-y-2">
                {plan.proximosPasos.map((p, i) => {
                  const Icono = tipoActividadDef(p.tipo)?.icon ?? IconCalendarPlus;
                  const hecho = agendados.has(i);
                  return (
                    <li key={i} className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 p-3">
                      <Icono size={16} stroke={1.75} className="mt-0.5 shrink-0 text-brand-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{p.titulo}</p>
                        {p.porque && <p className="text-xs text-slate-500 mt-0.5">{p.porque}</p>}
                      </div>
                      {hecho ? (
                        <span className={insignia("exito", "shrink-0")}>Agendado</span>
                      ) : (
                        <button onClick={() => setAgendando(p)} className={boton("secundario", "sm", "shrink-0")}>
                          <IconCalendarPlus size={14} stroke={2} />Agendar
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {plan.faltaSaber.length > 0 && (
            <section className="rounded-xl bg-slate-50 px-3 py-2">
              <h3 className="text-xs font-bold text-slate-600">Para afinar el plan, falta saber:</h3>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                {plan.faltaSaber.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}

      {agendando && (
        <AgendarPasoRapido
          oportunidad={oportunidad}
          tipos={tipos}
          tipoInicial={agendando.tipo}
          tituloInicial={agendando.titulo}
          onCerrar={() => setAgendando(null)}
          onAgendado={() => {
            const i = plan?.proximosPasos.indexOf(agendando) ?? -1;
            if (i >= 0) setAgendados(s => new Set(s).add(i));
            setAgendando(null);
            onAgendado();
          }}
        />
      )}
    </div>
  );
}
