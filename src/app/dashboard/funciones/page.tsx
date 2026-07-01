"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";

type Funcion = {
  id: string;
  titulo: string;
  fecha: string;
  sillasTotales: number;
  sillasVendidas: number;
  canal: string;
  ingresoEstimado: string | null;
  notas: string | null;
  _count: { npsList: number };
};

const CANALES = [
  { key: "PLATAFORMA", label: "Plataforma" },
  { key: "TAQUILLA",   label: "Taquilla" },
  { key: "INVITADOS",  label: "Invitados" },
  { key: "EMPRESA",    label: "Empresa" },
];

const FORM_VACIO = { titulo: "", fecha: "", sillasTotales: "239", sillasVendidas: "", canal: "PLATAFORMA", ingresoEstimado: "", notas: "" };

export default function FuncionesPage() {
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(FORM_VACIO);
  const [form, setForm] = useState(FORM_VACIO);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/funciones");
    setFunciones(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/funciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(FORM_VACIO);
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  function iniciarEdicion(f: Funcion) {
    setEditandoId(f.id);
    setEditForm({
      titulo: f.titulo,
      fecha: new Date(f.fecha).toISOString().slice(0, 16),
      sillasTotales: String(f.sillasTotales),
      sillasVendidas: String(f.sillasVendidas),
      canal: f.canal,
      ingresoEstimado: f.ingresoEstimado ?? "",
      notas: f.notas ?? "",
    });
  }

  async function handleGuardarEdicion(id: string) {
    setGuardando(true);
    await fetch(`/api/funciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditandoId(null);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta función?")) return;
    await fetch(`/api/funciones/${id}`, { method: "DELETE" });
    cargar();
  }

  async function exportar() {
    setExportando(true);
    const res = await fetch("/api/exportar/funciones");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funciones-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  function fmt(valor: string | null) {
    if (!valor) return "—";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  function ocupacion(f: Funcion) {
    return f.sillasTotales > 0 ? Math.round((f.sillasVendidas / f.sillasTotales) * 100) : 0;
  }

  const promOcupacion = funciones.length
    ? Math.round(funciones.reduce((acc, f) => acc + ocupacion(f), 0) / funciones.length) : 0;
  const totalIngreso = funciones.reduce((acc, f) => acc + Number(f.ingresoEstimado ?? 0), 0);
  const npsTotal = funciones.reduce((acc, f) => acc + f._count.npsList, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Funciones</h1>
        <p className="text-slate-500 text-sm mt-1">Registro de ocupación por función o evento</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total funciones" valor={funciones.length} emoji="🎭" color="bg-blue-500" />
        <KpiCard label="Ocupación promedio" valor={`${promOcupacion}%`} emoji="💺" color="bg-emerald-500" />
        <KpiCard label="Ingresos registrados" valor={fmt(String(totalIngreso))} emoji="💰" color="bg-violet-500" />
        <KpiCard label="Respuestas NPS" valor={npsTotal} emoji="⭐" color="bg-amber-500" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-slate-400">{funciones.length} funciones registradas</div>
        <div className="flex gap-2">
          <button onClick={exportar} disabled={exportando || funciones.length === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            {exportando ? "Generando..." : "↓ Exportar Excel"}
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Registrar función
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Nueva función</h2>
          <form onSubmit={handleCrear} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título / Obra *</label>
              <input required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha y hora *</label>
              <input required type="datetime-local" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Canal de venta</label>
              <select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                {CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas totales</label>
              <input type="number" value={form.sillasTotales} onChange={e => setForm({ ...form, sillasTotales: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas vendidas</label>
              <input type="number" value={form.sillasVendidas} onChange={e => setForm({ ...form, sillasVendidas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Ingreso estimado (COP)</label>
              <input type="number" value={form.ingresoEstimado} onChange={e => setForm({ ...form, ingresoEstimado: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : funciones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">Aún no hay funciones registradas.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Función / Obra</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Ocupación</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Canal</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Ingreso estimado</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">NPS</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wide">Notas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funciones.map(f => editandoId === f.id ? (
                <tr key={f.id} className="bg-blue-50">
                  <td className="px-2 py-2">
                    <input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
                      className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="datetime-local" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })}
                      className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <input type="number" placeholder="Vendidas" value={editForm.sillasVendidas}
                        onChange={e => setEditForm({ ...editForm, sillasVendidas: e.target.value })}
                        className="w-16 rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                      <span className="text-slate-400 text-xs self-center">/</span>
                      <input type="number" placeholder="Total" value={editForm.sillasTotales}
                        onChange={e => setEditForm({ ...editForm, sillasTotales: e.target.value })}
                        className="w-16 rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <select value={editForm.canal} onChange={e => setEditForm({ ...editForm, canal: e.target.value })}
                      className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none">
                      {CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" value={editForm.ingresoEstimado}
                      onChange={e => setEditForm({ ...editForm, ingresoEstimado: e.target.value })}
                      className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2 text-slate-400">{f._count.npsList > 0 ? `${f._count.npsList} resp.` : "—"}</td>
                  <td className="px-2 py-2">
                    <input value={editForm.notas} onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
                      className="w-full rounded-lg border border-blue-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleGuardarEdicion(f.id)} disabled={guardando}
                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{f.titulo}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(f.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${ocupacion(f) >= 70 ? "bg-emerald-500" : ocupacion(f) >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${ocupacion(f)}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">{ocupacion(f)}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{f.sillasVendidas}/{f.sillasTotales}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{CANALES.find(c => c.key === f.canal)?.label}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{fmt(f.ingresoEstimado)}</td>
                  <td className="px-4 py-3 text-slate-500">{f._count.npsList > 0 ? `${f._count.npsList} resp.` : "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[140px] truncate">{f.notas ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => iniciarEdicion(f)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(f.id)}
                        className="rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
            {funciones.length} funciones registradas
          </div>
        </div>
      )}
    </div>
  );
}
