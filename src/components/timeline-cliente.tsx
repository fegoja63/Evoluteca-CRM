"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ItemMeta = {
  completada?: boolean;
  notas?: string;
  valor?: number;
  oportunidadId?: string;
  cotizacionId?: string;
  descripcion?: string;
  contacto?: string;
  eventoId?: string;
};
type Item = {
  id: string;
  fecha: string;
  categoria: "ACTIVIDAD" | "OPORTUNIDAD" | "COTIZACION" | "EVENTO";
  titulo: string;
  subtitulo?: string;
  meta?: ItemMeta;
};

const CAT_CONFIG = {
  ACTIVIDAD:   { emoji: "📅", color: "border-blue-300 bg-blue-50",    dot: "bg-blue-500",    label: "Actividad" },
  OPORTUNIDAD: { emoji: "◈",  color: "border-violet-300 bg-violet-50", dot: "bg-violet-500",  label: "Oportunidad" },
  COTIZACION:  { emoji: "📄", color: "border-slate-300 bg-slate-50",   dot: "bg-slate-500",   label: "Cotización" },
  EVENTO:      { emoji: "💬", color: "border-emerald-300 bg-emerald-50",dot: "bg-emerald-500", label: "Evento" },
};

const TIPOS_EVENTO = ["NOTA", "LLAMADA", "EMAIL", "REUNION", "WHATSAPP"];

function fmtFecha(s: string) {
  const d = new Date(s);
  const ahora = new Date();
  const diff = ahora.getTime() - d.getTime();
  const dias = Math.floor(diff / 86400000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7)  return `Hace ${dias} días`;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function TimelineCliente({ empresaId, contactos }: { empresaId: string; contactos: { id: string; nombre: string }[] }) {
  const [items, setItems]       = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrar, setMostrar]   = useState(15);
  const [filtro, setFiltro]     = useState("TODOS");

  const [form, setForm] = useState({ tipo: "NOTA", titulo: "", descripcion: "", contactoId: "" });
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/timeline/${empresaId}`);
    setItems(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [empresaId]);

  async function guardarEvento(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    setGuardando(true);
    await fetch(`/api/timeline/${empresaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ tipo: "NOTA", titulo: "", descripcion: "", contactoId: "" });
    setGuardando(false);
    cargar();
  }

  async function eliminarEvento(eventoId: string) {
    await fetch(`/api/timeline/${empresaId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventoId }),
    });
    cargar();
  }

  const FILTROS = [
    { key: "TODOS", label: "Todo" },
    { key: "EVENTO", label: "💬 Notas" },
    { key: "ACTIVIDAD", label: "📅 Actividades" },
    { key: "OPORTUNIDAD", label: "◈ Oportunidades" },
    { key: "COTIZACION", label: "📄 Cotizaciones" },
  ];

  const itemsFiltrados = filtro === "TODOS" ? items : items.filter(i => i.categoria === filtro);
  const visibles = itemsFiltrados.slice(0, mostrar);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900">Timeline 360° — Historial del cliente</h2>
        <span className="text-xs text-slate-400">{itemsFiltrados.length} registros</span>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => { setFiltro(f.key); setMostrar(15); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtro === f.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Formulario nuevo evento */}
      <form onSubmit={guardarEvento} className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex gap-2 mb-2">
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500">
            {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {contactos.length > 0 && (
            <select value={form.contactoId} onChange={e => setForm(f => ({ ...f, contactoId: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500">
              <option value="">— Contacto (opcional) —</option>
              {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
        </div>
        <input
          type="text"
          placeholder="Título del evento, nota o interacción..."
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
        <button type="submit" disabled={guardando || !form.titulo.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "Guardando..." : "+ Registrar"}
        </button>
      </form>

      {/* Timeline */}
      {cargando ? (
        <p className="text-xs text-slate-400">Cargando historial...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400">Sin registros aún. Usa el formulario para agregar la primera interacción.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
          <div className="flex flex-col gap-3">
            {visibles.map(item => {
              const cfg = CAT_CONFIG[item.categoria];
              return (
                <div key={item.id} className="relative flex gap-4 pl-10 group">
                  <div className={`absolute left-2 top-2.5 w-3 h-3 rounded-full border-2 border-white ${cfg.dot} shrink-0`} />
                  <div className={`flex-1 rounded-xl border px-3 py-2.5 ${cfg.color}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs">{cfg.emoji}</span>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cfg.label}</span>
                          {item.subtitulo && (
                            <span className="text-xs text-slate-400">· {item.subtitulo}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{item.titulo}</p>
                        {item.meta?.descripcion && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.meta.descripcion}</p>
                        )}
                        {item.meta?.contacto && (
                          <p className="text-xs text-slate-400 mt-0.5">Con: {item.meta.contacto}</p>
                        )}
                        {item.meta?.valor ? (
                          <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.meta.valor)}
                          </p>
                        ) : null}
                        {item.meta?.cotizacionId && (
                          <Link href={`/dashboard/cotizaciones-formales/${item.meta.cotizacionId}`}
                            className="text-xs text-blue-600 hover:underline mt-0.5 block">
                            Ver cotización →
                          </Link>
                        )}
                        {item.meta?.oportunidadId && (
                          <Link href={`/dashboard/pipeline/${item.meta.oportunidadId}`}
                            className="text-xs text-blue-600 hover:underline mt-0.5 block">
                            Ver oportunidad →
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{fmtFecha(item.fecha)}</span>
                        {item.meta?.eventoId && (
                          <button onClick={() => eliminarEvento(item.meta!.eventoId!)}
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

          {itemsFiltrados.length > mostrar && (
            <button onClick={() => setMostrar(n => n + 15)}
              className="mt-4 ml-10 text-xs text-blue-600 hover:underline">
              Ver {Math.min(15, itemsFiltrados.length - mostrar)} más ({itemsFiltrados.length - mostrar} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
