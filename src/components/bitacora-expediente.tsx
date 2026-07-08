"use client";

import { useEffect, useState } from "react";

type Evento = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  creadoEn: string;
};

const TIPOS = ["AUDIENCIA", "AUTO", "ACTUACION", "NOTA", "LLAMADA", "EMAIL", "REUNION"];

const TIPO_CONFIG: Record<string, { emoji: string; color: string; dot: string }> = {
  AUDIENCIA:  { emoji: "🏛️", color: "border-violet-300 bg-violet-50",  dot: "bg-violet-500" },
  AUTO:       { emoji: "📜", color: "border-blue-300 bg-blue-50",     dot: "bg-blue-500" },
  ACTUACION:  { emoji: "⚖️", color: "border-slate-300 bg-slate-50",    dot: "bg-slate-500" },
  NOTA:       { emoji: "📝", color: "border-amber-300 bg-amber-50",   dot: "bg-amber-500" },
  LLAMADA:    { emoji: "📞", color: "border-emerald-300 bg-emerald-50", dot: "bg-emerald-500" },
  EMAIL:      { emoji: "✉️", color: "border-sky-300 bg-sky-50",       dot: "bg-sky-500" },
  REUNION:    { emoji: "🤝", color: "border-rose-300 bg-rose-50",     dot: "bg-rose-500" },
};

function fmtFecha(s: string) {
  const d = new Date(s);
  const ahora = new Date();
  const diff = ahora.getTime() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function BitacoraExpediente({ expedienteId, puedeEliminar }: { expedienteId: string; puedeEliminar: boolean }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ tipo: "ACTUACION", titulo: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/bitacora`);
      setEventos(await res.json());
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { setError(""); cargar(); }, [expedienteId]);

  async function guardarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setError("");
    setGuardando(true);
    try {
      const res = await fetch(`/api/expedientes/${expedienteId}/bitacora`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo registrar el evento");
        return;
      }
      setForm({ tipo: "ACTUACION", titulo: "", descripcion: "" });
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarEvento(eventoId: string) {
    if (!confirm("¿Eliminar este registro de la bitácora? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/expedientes/${expedienteId}/bitacora`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventoId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el registro");
      return;
    }
    cargar();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900">Bitácora del expediente</h2>
        <span className="text-xs text-slate-400">{eventos.length} registros</span>
      </div>

      <form onSubmit={guardarEvento} className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex gap-2 mb-2">
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500">
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input
          type="text"
          placeholder="Título de la actuación, audiencia o nota..."
          value={form.titulo}
          onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 mb-2"
        />
        <textarea
          placeholder="Descripción o detalle (opcional)"
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500 resize-none mb-2"
        />
        {error && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <button type="submit" disabled={guardando || !form.titulo.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "Guardando..." : "+ Registrar"}
        </button>
      </form>

      {cargando ? (
        <p className="text-xs text-slate-400">Cargando bitácora...</p>
      ) : eventos.length === 0 ? (
        <p className="text-xs text-slate-400">Sin registros aún. Usa el formulario para agregar la primera actuación.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
          <div className="flex flex-col gap-3">
            {eventos.map(ev => {
              const cfg = TIPO_CONFIG[ev.tipo] ?? TIPO_CONFIG.NOTA;
              return (
                <div key={ev.id} className="relative flex gap-4 pl-10 group">
                  <div className={`absolute left-2 top-2.5 w-3 h-3 rounded-full border-2 border-white ${cfg.dot} shrink-0`} />
                  <div className={`flex-1 rounded-xl border px-3 py-2.5 ${cfg.color}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs">{cfg.emoji}</span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{ev.tipo}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{ev.titulo}</p>
                        {ev.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5">{ev.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{fmtFecha(ev.creadoEn)}</span>
                        {puedeEliminar && (
                          <button onClick={() => eliminarEvento(ev.id)}
                            className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-base leading-none">
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
