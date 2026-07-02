"use client";

import { useEffect, useState } from "react";

type Producto = { id: string; nombre: string; descripcion: string | null; precioBase: string; activo: boolean };

function fmt(v: string | number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v));
}

export default function CatalogoPage() {
  const [lista, setLista]         = useState<Producto[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ nombre: "", descripcion: "", precioBase: "" });
  const [modo, setModo]           = useState<"lista" | "nuevo">("lista");
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/catalogo");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/productos");
    setLista(await res.json());
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    if (editId) {
      await fetch(`/api/productos/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditId(null);
    } else {
      await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({ nombre: "", descripcion: "", precioBase: "" });
    setModo("lista");
    setGuardando(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este servicio del catálogo?")) return;
    await fetch(`/api/productos/${id}`, { method: "DELETE" });
    cargar();
  }

  function iniciarEdicion(p: Producto) {
    setEditId(p.id);
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? "", precioBase: String(p.precioBase) });
    setModo("nuevo");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catálogo de servicios</h1>
          <p className="text-slate-500 text-sm mt-1">Servicios y productos que usas en tus cotizaciones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {exportando ? "Exportando..." : "⬇ Excel"}
          </button>
          <button onClick={() => { setModo(modo === "nuevo" ? "lista" : "nuevo"); setEditId(null); setForm({ nombre: "", descripcion: "", precioBase: "" }); }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {modo === "nuevo" ? "× Cancelar" : "+ Nuevo servicio"}
          </button>
        </div>
      </div>

      {/* Formulario */}
      {modo === "nuevo" && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">{editId ? "Editar servicio" : "Nuevo servicio"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del servicio *</label>
              <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Iluminación escénica, Sonido profesional..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Precio base (COP)</label>
              <input type="number" min={0} step={1000} value={form.precioBase} onChange={e => setForm(f => ({ ...f, precioBase: e.target.value }))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
              <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Breve descripción del servicio"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Agregar al catálogo"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-sm text-slate-500 mb-4">Aún no tienes servicios en el catálogo.</p>
          <p className="text-xs text-slate-400">Agrega tus servicios habituales para usarlos rápidamente al crear cotizaciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {lista.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-sm shrink-0">
                  🎯
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => iniciarEdicion(p)}
                    className="text-xs text-blue-600 hover:underline">Editar</button>
                  <span className="text-slate-200">·</span>
                  <button onClick={() => eliminar(p.id)}
                    className="text-xs text-red-400 hover:underline">Quitar</button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{p.nombre}</h3>
              {p.descripcion && <p className="text-xs text-slate-500 mb-2">{p.descripcion}</p>}
              <p className="text-base font-bold text-emerald-700">{fmt(p.precioBase)}</p>
              <p className="text-xs text-slate-400">Precio base</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
