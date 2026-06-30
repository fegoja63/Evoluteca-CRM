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
  _count: { npsList: number };
};

const CANALES = [
  { key: "PLATAFORMA", label: "Plataforma" },
  { key: "TAQUILLA", label: "Taquilla" },
  { key: "INVITADOS", label: "Invitados" },
  { key: "EMPRESA", label: "Empresa" },
];

export default function FuncionesPage() {
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    titulo: "", fecha: "", sillasTotales: "239", sillasVendidas: "",
    canal: "PLATAFORMA", ingresoEstimado: "", notas: "",
  });

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/funciones");
    const data = await res.json();
    setFunciones(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/funciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", fecha: "", sillasTotales: "239", sillasVendidas: "", canal: "PLATAFORMA", ingresoEstimado: "", notas: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  function ocupacion(f: Funcion) {
    return f.sillasTotales > 0 ? Math.round((f.sillasVendidas / f.sillasTotales) * 100) : 0;
  }

  function formatoMoneda(valor: string | null) {
    if (!valor) return "—";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  const promOcupacion = funciones.length
    ? Math.round(funciones.reduce((acc, f) => acc + ocupacion(f), 0) / funciones.length)
    : 0;

  const totalIngreso = funciones.reduce((acc, f) => acc + Number(f.ingresoEstimado ?? 0), 0);

  const npsTotal = funciones.reduce((acc, f) => acc + f._count.npsList, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Funciones</h1>
        <p className="text-slate-500 text-sm mt-1">Registro de ocupación por función o evento</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total funciones" valor={funciones.length} emoji="🎭" color="bg-blue-500" iconBg="bg-blue-50" />
        <KpiCard label="Ocupación promedio" valor={`${promOcupacion}%`} emoji="💺" color="bg-emerald-500" iconBg="bg-emerald-50" />
        <KpiCard label="Ingresos registrados" valor={formatoMoneda(String(totalIngreso))} emoji="💰" color="bg-violet-500" iconBg="bg-violet-50" />
        <KpiCard label="Respuestas NPS" valor={npsTotal} emoji="⭐" color="bg-amber-500" iconBg="bg-amber-50" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div></div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Registrar función
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Nueva función</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título / Obra *</label>
              <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha y hora *</label>
              <input required type="datetime-local" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Canal de venta</label>
              <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                {CANALES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas totales</label>
              <input type="number" value={form.sillasTotales} onChange={(e) => setForm({ ...form, sillasTotales: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas vendidas</label>
              <input type="number" value={form.sillasVendidas} onChange={(e) => setForm({ ...form, sillasVendidas: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Ingreso estimado (COP)</label>
              <input type="number" value={form.ingresoEstimado} onChange={(e) => setForm({ ...form, ingresoEstimado: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
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
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Función / Obra</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Ocupación</th>
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Ingreso estimado</th>
                <th className="px-4 py-3 font-medium">NPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funciones.map((f) => {
                const pct = ocupacion(f);
                return (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{f.titulo}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(f.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-slate-100">
                          <div className={`h-1.5 rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-600">{pct}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{f.sillasVendidas}/{f.sillasTotales} sillas</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{CANALES.find(c => c.key === f.canal)?.label ?? f.canal}</td>
                    <td className="px-4 py-3 text-slate-700">{formatoMoneda(f.ingresoEstimado)}</td>
                    <td className="px-4 py-3 text-slate-500">{f._count.npsList > 0 ? `${f._count.npsList} resp.` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
