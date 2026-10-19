"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendarPlus, IconX } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { useEscape } from "@/lib/use-escape";
import { fechaAtajo, type AtajoFecha } from "@/lib/proximo-paso";
import type { TipoActividadDef } from "@/lib/tipos-actividad";
import { boton, campo, cx } from "@/components/ui/estilos";

/**
 * Mini formulario para agendar el próximo paso de un negocio sin salir del
 * tablero del Pipeline (se abre desde el chip "Sin próximo paso" o desde el de
 * una tarea vencida). Crea la actividad con la misma API que la Agenda, ligada
 * a la oportunidad, su cliente y su contacto; el responsable es quien la crea.
 */

export type PasoAgendado = { fecha: string; tipo: string; titulo: string };

type Props = {
  oportunidad: { id: string; titulo: string; empresa: { id: string; nombre: string } | null; contacto: { id: string } | null };
  tipos: TipoActividadDef[];
  /** true si el negocio tenía una tarea vencida (cambia el texto del encabezado). */
  teniaVencida?: boolean;
  onCerrar: () => void;
  onAgendado: (paso: PasoAgendado) => void;
};

const ATAJOS: { key: AtajoFecha; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "en3", label: "En 3 días" },
  { key: "lunes", label: "Próx. lunes" },
];

const TITULO_POR_TIPO: Record<string, string> = {
  LLAMADA: "Llamada de seguimiento",
  REUNION: "Reunión de seguimiento",
  EMAIL: "Correo de seguimiento",
  TAREA: "Seguimiento",
  VISITA_COMERCIAL: "Visita comercial",
  VISITA_TECNICA: "Visita técnica",
};

export function AgendarPasoRapido({ oportunidad, tipos, teniaVencida, onCerrar, onAgendado }: Props) {
  const [tipo, setTipo] = useState(tipos.find(t => t.key === "LLAMADA")?.key ?? tipos[0]?.key ?? "TAREA");
  const [titulo, setTitulo] = useState(TITULO_POR_TIPO[tipo] ?? "Seguimiento");
  const [tituloEditado, setTituloEditado] = useState(false);
  const [fecha, setFecha] = useState(() => fechaAtajo("manana") ?? "");
  const [guardando, setGuardando] = useState(false);
  const primerBoton = useRef<HTMLButtonElement>(null);

  useEscape(!guardando, onCerrar);
  useEffect(() => { primerBoton.current?.focus(); }, []);

  function elegirTipo(key: string) {
    setTipo(key);
    // El título sigue al tipo mientras el usuario no lo haya escrito él.
    if (!tituloEditado) setTitulo(TITULO_POR_TIPO[key] ?? "Seguimiento");
  }

  async function agendar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !fecha) return;
    setGuardando(true);
    const res = await fetch("/api/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        titulo: titulo.trim(),
        fecha, // "YYYY-MM-DDTHH:mm" en hora de Bogotá; la API la ancla (anclarBogota)
        oportunidadId: oportunidad.id,
        empresaId: oportunidad.empresa?.id ?? null,
        contactoId: oportunidad.contacto?.id ?? null,
      }),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo agendar el próximo paso.");
      return;
    }
    const creada = await res.json();
    toast.success("Próximo paso agendado");
    onAgendado({ fecha: creada.fecha, tipo: creada.tipo, titulo: creada.titulo });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={() => { if (!guardando) onCerrar(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="agendar-paso-titulo" onSubmit={agendar}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-modal-in">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="agendar-paso-titulo" className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <IconCalendarPlus size={16} stroke={1.75} className="text-brand-600" />
              {teniaVencida ? "Agendar un nuevo paso" : "Agendar próximo paso"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-slate-500" title={oportunidad.titulo}>
              {oportunidad.titulo}{oportunidad.empresa ? ` · ${oportunidad.empresa.nombre}` : ""}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">
            <IconX size={16} stroke={1.75} />
          </button>
        </div>

        <p className="mb-1.5 text-xs font-medium text-slate-600">Qué</p>
        <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de actividad">
          {tipos.map((t, i) => {
            const Icono = t.icon;
            const activo = tipo === t.key;
            return (
              <button key={t.key} ref={i === 0 ? primerBoton : undefined} type="button" role="radio" aria-checked={activo}
                onClick={() => elegirTipo(t.key)}
                className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  activo ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <Icono size={13} stroke={1.75} />{t.label}
              </button>
            );
          })}
        </div>

        <input value={titulo} onChange={e => { setTitulo(e.target.value); setTituloEditado(true); }}
          aria-label="Título de la actividad" maxLength={300} required
          className={campo("md", "mb-3 w-full")} />

        <p className="mb-1.5 text-xs font-medium text-slate-600">Cuándo</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {ATAJOS.map(a => {
            const valor = fechaAtajo(a.key);
            if (!valor) return null; // "Hoy" no se ofrece de noche
            const activo = fecha === valor;
            return (
              <button key={a.key} type="button" onClick={() => setFecha(valor)} aria-pressed={activo}
                className={cx("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  activo ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                {a.label}
              </button>
            );
          })}
        </div>
        <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} required
          aria-label="Fecha y hora" className={campo("md", "mb-4 w-full")} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={guardando} className={boton("secundario", "md")}>Cancelar</button>
          <button type="submit" disabled={guardando || !titulo.trim() || !fecha} className={boton("primario", "md")}>
            <IconCalendarPlus size={16} stroke={1.75} />{guardando ? "Agendando…" : "Agendar"}
          </button>
        </div>
      </form>
    </div>
  );
}
