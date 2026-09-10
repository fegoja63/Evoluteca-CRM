"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  IconMessageChatbot, IconPlus, IconEdit, IconTrash, IconX, IconCheck,
  IconCircleX, IconSparkles, IconDownload,
} from "@tabler/icons-react";

type Objecion = {
  id: string; categoria: string | null; objecion: string; respuesta: string;
  loQueNoDecir: string | null; orden: number; activa: boolean;
};

const FORM_VACIO = { categoria: "", objecion: "", respuesta: "", loQueNoDecir: "" };

export default function ObjecionesPage() {
  const { data: session } = useSession();
  const esEditor = session?.user?.rol === "ADMINISTRADOR" || session?.user?.rol === "GERENTE";

  const [lista, setLista] = useState<Objecion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<"lista" | "form">("lista");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [cargandoSugeridas, setCargandoSugeridas] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/objeciones");
    setLista(res.ok ? await res.json() : []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  function abrirNuevo() { setEditId(null); setForm(FORM_VACIO); setModo("form"); setError(""); }
  function abrirEdicion(o: Objecion) {
    setEditId(o.id);
    setForm({ categoria: o.categoria ?? "", objecion: o.objecion, respuesta: o.respuesta, loQueNoDecir: o.loQueNoDecir ?? "" });
    setModo("form"); setError("");
  }

  async function guardar() {
    if (!form.objecion.trim() || !form.respuesta.trim()) { setError("La objeción y la respuesta son obligatorias."); return; }
    setGuardando(true); setError("");
    const res = editId
      ? await fetch(`/api/objeciones/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/objeciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setGuardando(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "No se pudo guardar."); return; }
    setModo("lista"); setForm(FORM_VACIO); setEditId(null); cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta objeción de la guía?")) return;
    const res = await fetch(`/api/objeciones/${id}`, { method: "DELETE" });
    if (res.ok) cargar();
  }

  async function cargarSugeridas() {
    setCargandoSugeridas(true); setError("");
    const res = await fetch("/api/objeciones/sugeridas", { method: "POST" });
    setCargandoSugeridas(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "No se pudieron cargar."); return; }
    cargar();
  }

  // Agrupa por categoría, respetando el orden de la lista.
  const categorias = Array.from(new Set(lista.map(o => o.categoria || "Sin categoría")));

  if (cargando) return <p className="text-sm text-slate-400 p-6">Cargando…</p>;

  return (
    <div className="max-w-4xl">
      {/* Encabezado */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><IconMessageChatbot size={22} stroke={1.75} /> Manejo de objeciones</h1>
            <p className="text-brand-300 text-sm mt-1 max-w-xl">
              La clave no es pelear la objeción: es entender la <strong className="text-white">prioridad</strong>, el <strong className="text-white">contexto</strong> y el <strong className="text-white">valor percibido</strong>. Esta guía es de tu equipo — adáptala a tu negocio.
            </p>
          </div>
          {esEditor && (
            <button onClick={abrirNuevo} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-accent-600 hover:bg-accent-700 px-3 py-2 text-sm font-medium">
              <IconPlus size={16} stroke={2} /> Nueva
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500 px-1">{error}</p>}

      {/* Formulario */}
      {modo === "form" && esEditor && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">{editId ? "Editar objeción" : "Nueva objeción"}</h2>
            <button onClick={() => { setModo("lista"); setEditId(null); setForm(FORM_VACIO); }} className="text-slate-400 hover:text-slate-700"><IconX size={18} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Categoría (opcional)</label>
                <input type="text" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  placeholder="Precio, Competencia…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Objeción del cliente *</label>
                <input type="text" value={form.objecion} onChange={e => setForm(f => ({ ...f, objecion: e.target.value }))}
                  placeholder='Ej: "Es muy caro"' className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1"><IconCheck size={14} stroke={2} /> Respuesta recomendada *</label>
              <textarea value={form.respuesta} onChange={e => setForm(f => ({ ...f, respuesta: e.target.value }))} rows={2}
                placeholder="La respuesta que abre conversación…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-red-600 mb-1 flex items-center gap-1"><IconCircleX size={14} stroke={2} /> Lo que NO conviene responder (opcional)</label>
              <textarea value={form.loQueNoDecir} onChange={e => setForm(f => ({ ...f, loQueNoDecir: e.target.value }))} rows={2}
                placeholder="La respuesta que cierra la puerta…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 resize-none" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={guardar} disabled={guardando} className="rounded-xl bg-accent-600 hover:bg-accent-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Agregar a la guía"}
              </button>
              <button onClick={() => { setModo("lista"); setEditId(null); setForm(FORM_VACIO); }} className="text-sm text-slate-500 hover:text-slate-800">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <IconMessageChatbot size={36} stroke={1.5} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Aún no tienes objeciones en la guía</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Empieza con un set probado de 15 y adáptalo, o crea las tuyas.</p>
          {esEditor && (
            <button onClick={cargarSugeridas} disabled={cargandoSugeridas}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              <IconSparkles size={16} stroke={1.75} /> {cargandoSugeridas ? "Cargando…" : "Cargar las 15 recomendadas"}
            </button>
          )}
        </div>
      ) : (
        <>
          {esEditor && (
            <div className="mb-4 flex justify-end">
              <button onClick={cargarSugeridas} disabled={cargandoSugeridas}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                <IconDownload size={14} stroke={1.75} /> {cargandoSugeridas ? "Cargando…" : "Añadir las 15 recomendadas"}
              </button>
            </div>
          )}
          {categorias.map(cat => (
            <div key={cat} className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{cat}</p>
              <div className="flex flex-col gap-3">
                {lista.filter(o => (o.categoria || "Sin categoría") === cat).map(o => (
                  <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 flex-1">“{o.objecion}”</p>
                      {esEditor && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => abrirEdicion(o)} className="text-slate-300 hover:text-brand-600 p-1" title="Editar"><IconEdit size={16} stroke={1.75} /></button>
                          <button onClick={() => eliminar(o.id)} className="text-slate-300 hover:text-red-500 p-1" title="Eliminar"><IconTrash size={16} stroke={1.75} /></button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                      <IconCheck size={16} stroke={2} className="text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-emerald-900">{o.respuesta}</p>
                    </div>
                    {o.loQueNoDecir && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                        <IconCircleX size={16} stroke={2} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-800/80"><span className="font-semibold">Evita:</span> {o.loQueNoDecir}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
