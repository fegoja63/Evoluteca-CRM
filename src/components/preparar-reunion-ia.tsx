"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconHelpCircle, IconListCheck, IconPackage, IconSparkles, IconTarget, IconUsers, IconX } from "@tabler/icons-react";
import { boton, cx } from "@/components/ui/estilos";
import { useEscape } from "@/lib/use-escape";
import type { PrepararReunion } from "@/lib/preparar-reunion";

type Props = { actividadId: string; titulo: string; className?: string };

// Botón "Preparar" de una reunión o visita pendiente (Agenda y ficha de la
// oportunidad). Abre una ventana donde la IA arma objetivo, agenda,
// asistentes, preguntas, qué llevar y la invitación lista para copiar.
export function PrepararReunionIA({ actividadId, titulo, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [prep, setPrep] = useState<PrepararReunion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEscape(abierto, () => setAbierto(false));

  async function preparar() {
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/ia/preparar-reunion/${actividadId}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setError(d.error ?? "No se pudo preparar la reunión.");
      else setPrep(d.preparacion);
    } catch {
      setError("No se pudo preparar la reunión. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function abrir() {
    setAbierto(true);
    if (!prep && !cargando) preparar();
  }

  async function copiar() {
    if (!prep) return;
    try {
      await navigator.clipboard.writeText(`${prep.invitacion.asunto}\n\n${prep.invitacion.cuerpo}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles */ }
  }

  return (
    <>
      <button type="button" onClick={abrir} title="Preparar esta reunión con IA"
        className={cx(boton("secundario", "sm"), "shrink-0", className)}>
        <IconSparkles size={14} stroke={2} />Preparar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => setAbierto(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="preparar-reunion-titulo" onClick={e => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl animate-modal-in">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h2 id="preparar-reunion-titulo" className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <IconSparkles size={16} stroke={1.75} className="text-brand-600" />Preparar reunión
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500" title={titulo}>{titulo}</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">
                <IconX size={16} stroke={1.75} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {cargando && <p className="text-sm text-slate-500">Preparando con lo que el CRM sabe de este negocio…</p>}
              {error && !cargando && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">{error}</p>
                  <button type="button" onClick={preparar} className={boton("secundario", "sm")}>Intentar de nuevo</button>
                </div>
              )}

              {prep && !cargando && !error && (
                <div className="space-y-4">
                  <p className="flex items-start gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
                    <IconTarget size={16} stroke={1.75} className="mt-0.5 shrink-0" />
                    <span><span className="font-semibold">Objetivo:</span> {prep.objetivo}</span>
                  </p>

                  <Seccion icono={IconListCheck} titulo="Agenda">
                    <ol className="space-y-1.5">
                      {prep.agenda.map((a, i) => (
                        <li key={i} className="text-sm text-slate-700">
                          <span className="font-semibold">{i + 1}. {a.punto}</span>
                          {a.porque && <span className="text-slate-500"> — {a.porque}</span>}
                        </li>
                      ))}
                    </ol>
                  </Seccion>

                  {prep.participantes.length > 0 && (
                    <Seccion icono={IconUsers} titulo="Quiénes deben estar">
                      <ul className="space-y-1">
                        {prep.participantes.map((p, i) => (
                          <li key={i} className="text-sm text-slate-700"><span className="font-semibold">{p.persona}:</span> {p.porque}</li>
                        ))}
                      </ul>
                    </Seccion>
                  )}

                  {prep.preguntas.length > 0 && (
                    <Seccion icono={IconHelpCircle} titulo="Preguntas pendientes">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {prep.preguntas.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </Seccion>
                  )}

                  {prep.llevar.length > 0 && (
                    <Seccion icono={IconPackage} titulo="Qué preparar o llevar">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {prep.llevar.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </Seccion>
                  )}

                  <section className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Invitación para el cliente</h3>
                      <button type="button" onClick={copiar} className={boton("secundario", "sm")}>
                        {copiado ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={2} />}
                        {copiado ? "Copiada" : "Copiar"}
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{prep.invitacion.asunto}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{prep.invitacion.cuerpo}</p>
                  </section>
                </div>
              )}
            </div>

            {prep && !cargando && (
              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
                <button type="button" onClick={preparar} className={boton("secundario", "sm")}>
                  <IconSparkles size={14} stroke={2} />Preparar de nuevo
                </button>
                <button type="button" onClick={() => setAbierto(false)} className={boton("primario", "sm")}>Listo</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Seccion({ icono: Icono, titulo, children }: { icono: typeof IconTarget; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icono size={14} stroke={1.75} />{titulo}
      </h3>
      {children}
    </section>
  );
}
