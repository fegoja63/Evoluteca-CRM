"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconPlus, IconX, IconPackage, IconTarget, IconTrash } from "@tabler/icons-react";
import { MoneyInput } from "@/components/money-input";

type Producto = { id: string; nombre: string; descripcion: string | null; precioBase: string; activo: boolean };
type Fila = { nombre: string; descripcion: string; precioBase: string };

const filaVacia = (): Fila => ({ nombre: "", descripcion: "", precioBase: "" });

function fmt(v: string | number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v));
}

export default function CatalogoPage() {
  const [lista, setLista]         = useState<Producto[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ nombre: "", descripcion: "", precioBase: "" });
  const [filas, setFilas]         = useState<Fila[]>([filaVacia()]);
  const [modo, setModo]           = useState<"lista" | "nuevo">("lista");
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError]         = useState("");

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
    setError("");
    // Edición: una sola fila vía PATCH
    if (editId) {
      if (!form.nombre.trim()) return;
      setGuardando(true);
      const res = await fetch(`/api/productos/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el servicio");
        setGuardando(false);
        return;
      }
      setEditId(null);
      setForm({ nombre: "", descripcion: "", precioBase: "" });
      setModo("lista");
      setGuardando(false);
      cargar();
      return;
    }

    // Nuevo: una o varias filas vía POST
    const validas = filas.filter(f => f.nombre.trim());
    if (validas.length === 0) {
      setError("Agrega al menos una línea con nombre.");
      return;
    }
    setGuardando(true);
    for (const f of validas) {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `No se pudo guardar "${f.nombre}"`);
        setGuardando(false);
        cargar();
        return;
      }
    }
    setFilas([filaVacia()]);
    setModo("lista");
    setGuardando(false);
    cargar();
  }

  function updateFila(i: number, field: keyof Fila, val: string) {
    setFilas(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));
  }
  function addFila() {
    setFilas(prev => [...prev, filaVacia()]);
  }
  function removeFila(i: number) {
    setFilas(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este servicio del catálogo?")) return;
    setError("");
    const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo desactivar el servicio");
      return;
    }
    cargar();
  }

  function iniciarEdicion(p: Producto) {
    setEditId(p.id);
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? "", precioBase: String(p.precioBase) });
    setModo("nuevo");
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Catálogo de servicios</h1>
          <p className="text-slate-500 text-sm mt-1">Servicios y productos que usas en tus cotizaciones</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <IconDownload size={16} stroke={1.75} />
            {exportando ? "Exportando..." : "Excel"}
          </button>
          <button onClick={() => { setModo(modo === "nuevo" ? "lista" : "nuevo"); setEditId(null); setForm({ nombre: "", descripcion: "", precioBase: "" }); setFilas([filaVacia()]); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            {modo === "nuevo" ? <IconX size={16} stroke={1.75} /> : <IconPlus size={16} stroke={1.75} />}
            {modo === "nuevo" ? "Cancelar" : "Nuevo servicio"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Formulario */}
      {modo === "nuevo" && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">{editId ? "Editar servicio" : "Nuevos servicios"}</h2>

          {editId ? (
            /* Edición: un solo servicio */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del servicio *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Iluminación escénica, Sonido profesional..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Precio base (COP)</label>
                <MoneyInput value={form.precioBase} onChange={v => setForm(f => ({ ...f, precioBase: v }))}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
                <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Breve descripción del servicio"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
          ) : (
            /* Nuevo: una o varias líneas */
            <div className="flex flex-col gap-3">
              {filas.map((f, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del servicio *</label>
                    <input type="text" value={f.nombre} onChange={e => updateFila(i, "nombre", e.target.value)}
                      placeholder="Ej: Iluminación escénica, Sonido profesional..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Precio base (COP)</label>
                    <MoneyInput value={f.precioBase} onChange={v => updateFila(i, "precioBase", v)}
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
                    <input type="text" value={f.descripcion} onChange={e => updateFila(i, "descripcion", e.target.value)}
                      placeholder="Breve descripción"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                  <div className="sm:col-span-1 flex sm:justify-center">
                    <button type="button" onClick={() => removeFila(i)} disabled={filas.length === 1}
                      title="Quitar línea"
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200">
                      <IconTrash size={16} stroke={1.75} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addFila}
                className="self-start inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600">
                <IconPlus size={16} stroke={1.75} />
                Agregar otra línea
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={guardar} disabled={guardando || (editId ? !form.nombre.trim() : !filas.some(f => f.nombre.trim()))}
              className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
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
          <IconPackage size={32} stroke={1.5} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-500 mb-4">Aún no tienes servicios en el catálogo.</p>
          <p className="text-xs text-slate-400">Agrega tus servicios habituales para usarlos rápidamente al crear cotizaciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {lista.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-200 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <IconTarget size={16} stroke={1.75} className="text-brand-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => iniciarEdicion(p)}
                    className="text-xs text-brand-600 hover:underline">Editar</button>
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
