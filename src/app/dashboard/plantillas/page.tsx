"use client";

import { useEffect, useState } from "react";

type ItemPlantilla = { id: string; descripcion: string; cantidad: string | number; precioUnit: string | number };
type Plantilla = { id: string; nombre: string; notas: string | null; creadoEn: string; items: ItemPlantilla[] };
type Linea = { descripcion: string; cantidad: string; precioUnit: string };

const LINEA_VACIA: Linea = { descripcion: "", cantidad: "1", precioUnit: "" };

function fmt(v: string | number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v));
}

function LineasEditor({ lineas, onChange }: { lineas: Linea[]; onChange: (lineas: Linea[]) => void }) {
  function updateLinea(i: number, campo: keyof Linea, val: string) {
    onChange(lineas.map((l, idx) => idx === i ? { ...l, [campo]: val } : l));
  }
  function addLinea() {
    onChange([...lineas, { ...LINEA_VACIA }]);
  }
  function removeLinea(i: number) {
    onChange(lineas.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">Ítems</label>
      <div className="flex flex-col gap-2">
        {lineas.map((linea, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_130px_auto] gap-2 items-center">
            <input type="text" placeholder="Ej: Iluminación escénica" value={linea.descripcion}
              onChange={e => updateLinea(i, "descripcion", e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            <input type="number" min={1} value={linea.cantidad}
              onChange={e => updateLinea(i, "cantidad", e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 text-center" />
            <input type="number" min={0} placeholder="0" value={linea.precioUnit}
              onChange={e => updateLinea(i, "precioUnit", e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 text-right" />
            <button type="button" onClick={() => removeLinea(i)} disabled={lineas.length === 1}
              className="text-slate-300 hover:text-red-500 disabled:opacity-30 text-lg font-bold leading-none">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addLinea} className="mt-3 text-sm text-blue-600 hover:underline">
        + Línea vacía
      </button>
    </div>
  );
}

export default function PlantillasPage() {
  const [lista, setLista] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState<"lista" | "nuevo">("lista");
  const [nombre, setNombre] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [lineasEdit, setLineasEdit] = useState<Linea[]>([{ ...LINEA_VACIA }]);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/plantillas-cotizacion");
    setLista(await res.json());
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function crear() {
    if (!nombre.trim()) return;
    setGuardando(true);
    setError("");
    const res = await fetch("/api/plantillas-cotizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        items: lineas
          .filter(l => l.descripcion.trim())
          .map(l => ({ descripcion: l.descripcion, cantidad: l.cantidad, precioUnit: l.precioUnit })),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la plantilla");
      setGuardando(false);
      return;
    }
    setNombre("");
    setLineas([{ ...LINEA_VACIA }]);
    setModo("lista");
    setGuardando(false);
    cargar();
  }

  function iniciarEdicion(p: Plantilla) {
    setExpandidoId(null);
    setEditandoId(p.id);
    setNombreEdit(p.nombre);
    setLineasEdit(
      p.items.length > 0
        ? p.items.map(it => ({ descripcion: it.descripcion, cantidad: String(it.cantidad), precioUnit: String(it.precioUnit) }))
        : [{ ...LINEA_VACIA }]
    );
  }

  async function guardarEdicion(id: string) {
    if (!nombreEdit.trim()) return;
    setGuardando(true);
    setError("");
    const res = await fetch(`/api/plantillas-cotizacion/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombreEdit,
        items: lineasEdit
          .filter(l => l.descripcion.trim())
          .map(l => ({ descripcion: l.descripcion, cantidad: l.cantidad, precioUnit: l.precioUnit })),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar la plantilla");
      setGuardando(false);
      return;
    }
    setEditandoId(null);
    setGuardando(false);
    cargar();
  }

  async function eliminar(id: string, nombrePlantilla: string) {
    if (!confirm(`¿Eliminar la plantilla "${nombrePlantilla}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/plantillas-cotizacion/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar la plantilla");
      return;
    }
    cargar();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plantillas de cotización</h1>
          <p className="text-slate-500 text-sm mt-1">Guarda combinaciones de ítems que usas seguido para armar cotizaciones más rápido</p>
        </div>
        <button
          onClick={() => { setModo(modo === "nuevo" ? "lista" : "nuevo"); setNombre(""); setLineas([{ ...LINEA_VACIA }]); setError(""); setEditandoId(null); }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {modo === "nuevo" ? "× Cancelar" : "+ Nueva plantilla"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {modo === "nuevo" && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Nueva plantilla</h2>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la plantilla *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Evento corporativo estándar"
              className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>

          <LineasEditor lineas={lineas} onChange={setLineas} />

          <div className="mt-5 flex gap-2">
            <button onClick={crear} disabled={guardando || !nombre.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar plantilla"}
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm text-slate-500 mb-1">Aún no tienes plantillas guardadas.</p>
          <p className="text-xs text-slate-400">También puedes crear una desde el botón "★ Guardar plantilla" al ver una cotización.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              {editandoId === p.id ? (
                <div>
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre de la plantilla *</label>
                    <input autoFocus type="text" value={nombreEdit} onChange={e => setNombreEdit(e.target.value)}
                      className="w-full max-w-md rounded-xl border border-blue-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <LineasEditor lineas={lineasEdit} onChange={setLineasEdit} />
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => guardarEdicion(p.id)} disabled={guardando || !nombreEdit.trim()}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                      {guardando ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button onClick={() => setEditandoId(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setExpandidoId(expandidoId === p.id ? null : p.id)} className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">{p.nombre}</h3>
                        <p className="text-xs text-slate-400">{p.items.length} ítem(s) · creada el {new Date(p.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </button>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => iniciarEdicion(p)} className="text-xs text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => eliminar(p.id, p.nombre)} className="text-xs text-red-400 hover:underline">Eliminar</button>
                    </div>
                  </div>
                  {expandidoId === p.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">
                      {p.items.map(it => (
                        <div key={it.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{it.descripcion} × {it.cantidad}</span>
                          <span className="font-medium">{fmt(Number(it.precioUnit) * Number(it.cantidad))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
