"use client";

import { useEffect, useState } from "react";
import {
  IconClipboardList, IconCalendar, IconX, IconPlus, IconBuildingPavilion,
  IconEdit, IconTrash,
} from "@tabler/icons-react";
import { boton, campo } from "@/components/ui/estilos";
import { SkeletonTarjetas, EstadoVacio } from "@/components/ui/estados";

type Salon = { id: string; nombre: string; capacidad: number | null; descripcion: string | null; activo: boolean };

export default function SalonesPage() {
  const [lista, setLista]         = useState<Salon[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ nombre: "", capacidad: "", descripcion: "" });
  const [modo, setModo]           = useState<"lista" | "nuevo">("lista");
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState("");

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/salones");
    setLista(await res.json());
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function guardar() {
    if (!form.nombre.trim()) return;
    setGuardando(true);
    setError("");
    const res = editId
      ? await fetch(`/api/salones/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      : await fetch("/api/salones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar el salón");
      setGuardando(false);
      return;
    }
    setEditId(null);
    setForm({ nombre: "", capacidad: "", descripcion: "" });
    setModo("lista");
    setGuardando(false);
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Desactivar este salón?")) return;
    setError("");
    const res = await fetch(`/api/salones/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo desactivar el salón");
      return;
    }
    cargar();
  }

  function iniciarEdicion(s: Salon) {
    setEditId(s.id);
    setForm({ nombre: s.nombre, capacidad: s.capacidad ? String(s.capacidad) : "", descripcion: s.descripcion ?? "" });
    setModo("nuevo");
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Salones</h1>
          <p className="text-slate-500 text-sm mt-1">Catálogo de espacios que alquilas para eventos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/salones/dia"
            className={boton("secundario", "md", "flex")}>
            <IconClipboardList size={15} stroke={1.75} />Ver por día
          </a>
          <a href="/dashboard/salones/calendario"
            className={boton("secundario", "md", "flex")}>
            <IconCalendar size={15} stroke={1.75} />Calendario
          </a>
          <button onClick={() => { setModo(modo === "nuevo" ? "lista" : "nuevo"); setEditId(null); setForm({ nombre: "", capacidad: "", descripcion: "" }); }}
            className={boton("primario", "md", "flex")}>
            {modo === "nuevo" ? <><IconX size={15} stroke={1.75} />Cancelar</> : <><IconPlus size={15} stroke={1.75} />Nuevo salón</>}
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
          <h2 className="text-sm font-bold text-slate-700 mb-4">{editId ? "Editar salón" : "Nuevo salón"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del salón *</label>
              <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Salón Principal, Salón A, Terraza..."
                className={campo("md", "w-full")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Capacidad (personas)</label>
              <input type="number" min={0} value={form.capacidad} onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))}
                placeholder="0"
                className={campo("md", "w-full")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción (opcional)</label>
              <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Piso, características, etc."
                className={campo("md", "w-full")} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
              className={boton("primario", "md")}>
              {guardando ? "Guardando..." : editId ? "Guardar cambios" : "Agregar salón"}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <SkeletonTarjetas />
      ) : lista.length === 0 ? (
        <EstadoVacio icon={IconBuildingPavilion} titulo="Aún no tienes salones registrados"
          descripcion="Agrega tus espacios para poder asignarlos en cada cotización y evitar choques de fecha."
          accion={<button onClick={() => { setModo("nuevo"); setEditId(null); setForm({ nombre: "", capacidad: "", descripcion: "" }); }}
            className={boton("primario", "md")}><IconPlus size={16} stroke={1.75} />Nuevo salón</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {lista.map(s => (
            <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-200 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <IconBuildingPavilion size={16} stroke={1.75} className="text-brand-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => iniciarEdicion(s)}
                    className="text-xs text-brand-600 hover:underline flex items-center gap-0.5"><IconEdit size={12} stroke={1.75} />Editar</button>
                  <span className="text-slate-200">·</span>
                  <button onClick={() => eliminar(s.id)}
                    className="text-xs text-red-400 hover:underline flex items-center gap-0.5"><IconTrash size={12} stroke={1.75} />Quitar</button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{s.nombre}</h3>
              {s.descripcion && <p className="text-xs text-slate-500 mb-2">{s.descripcion}</p>}
              {s.capacidad != null && (
                <>
                  <p className="text-base font-bold text-emerald-700">{s.capacidad} personas</p>
                  <p className="text-xs text-slate-400">Capacidad</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
