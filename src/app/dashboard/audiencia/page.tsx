"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";

type Espectador = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  segmento: string;
  notas: string | null;
  creadoEn: string;
  _count: { npsList: number };
};

const SEGMENTOS = [
  { key: "INDIVIDUAL", label: "Individual" },
  { key: "GRUPO", label: "Grupo" },
  { key: "EMPRESA", label: "Empresa" },
  { key: "COLEGIO", label: "Colegio" },
];

const SEGMENTO_COLOR: Record<string, string> = {
  INDIVIDUAL: "bg-blue-50 text-blue-700",
  GRUPO: "bg-violet-50 text-violet-700",
  EMPRESA: "bg-emerald-50 text-emerald-700",
  COLEGIO: "bg-amber-50 text-amber-700",
};

export default function AudienciaPage() {
  const [espectadores, setEspectadores] = useState<Espectador[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", segmento: "INDIVIDUAL", notas: "" });

  async function cargar(q = "") {
    setCargando(true);
    const res = await fetch(`/api/espectadores?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setEspectadores(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/espectadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", email: "", telefono: "", segmento: "INDIVIDUAL", notas: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda);
  }

  const conEmail = espectadores.filter(e => e.email).length;
  const conNps = espectadores.filter(e => e._count.npsList > 0).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Audiencia</h1>
        <p className="text-slate-500 text-sm mt-1">Espectadores y público de tus eventos</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total espectadores" valor={espectadores.length} emoji="👥" color="bg-blue-500" iconBg="bg-blue-50" />
        <KpiCard label="Con email" valor={conEmail} emoji="✉️" color="bg-emerald-500" iconBg="bg-emerald-50" sub="Alcanzables por campaña" />
        <KpiCard label="Con NPS registrado" valor={conNps} emoji="⭐" color="bg-violet-500" iconBg="bg-violet-50" />
        <KpiCard label="Empresas / Colegios" valor={espectadores.filter(e => e.segmento === "EMPRESA" || e.segmento === "COLEGIO").length}
          emoji="🏢" color="bg-amber-500" iconBg="bg-amber-50" sub="Potencial B2B" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <input type="text" placeholder="Buscar espectador..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 w-72" />
        <button onClick={() => setMostrarForm(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nuevo espectador
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Nuevo espectador</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Segmento</label>
              <select value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                {SEGMENTOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
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
      ) : espectadores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">
            {busqueda ? "No se encontraron resultados." : "Aún no hay espectadores registrados."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">NPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {espectadores.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{e.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${SEGMENTO_COLOR[e.segmento]}`}>
                      {SEGMENTOS.find(s => s.key === e.segmento)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{e._count.npsList > 0 ? `${e._count.npsList} resp.` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
