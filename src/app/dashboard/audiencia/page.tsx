"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import {
  IconUsers, IconRefresh, IconMail, IconStar, IconBuilding, IconMessageCircle,
  IconDownload, IconPlus, IconX,
} from "@tabler/icons-react";

type Espectador = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  segmento: string;
  nivelMembresia: string | null;
  notas: string | null;
  creadoEn: string;
  _count: { npsList: number };
  asistencias: { funcion: { fecha: string } }[];
};

type Recencia = "A" | "B" | "C" | null;

const RECENCIA_LABEL: Record<string, string> = {
  A: "Activo (0-3m)",
  B: "Tibio (3-12m)",
  C: "Frío (+12m)",
};
const RECENCIA_COLOR: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700",
  B: "bg-amber-50 text-amber-700",
  C: "bg-red-50 text-red-600",
};

function ultimaAsistencia(esp: Espectador): Date | null {
  if (esp.asistencias.length === 0) return null;
  return new Date(Math.max(...esp.asistencias.map(a => new Date(a.funcion.fecha).getTime())));
}

function segmentoRecencia(esp: Espectador): Recencia {
  const ultima = ultimaAsistencia(esp);
  if (!ultima) return null;
  const dias = (Date.now() - ultima.getTime()) / 86_400_000;
  if (dias <= 90) return "A";
  if (dias <= 365) return "B";
  return "C";
}

const SEGMENTOS = [
  { key: "INDIVIDUAL", label: "Individual" },
  { key: "GRUPO",      label: "Grupo" },
  { key: "EMPRESA",    label: "Empresa" },
  { key: "COLEGIO",    label: "Colegio" },
];

const SEG_COLOR: Record<string, string> = {
  INDIVIDUAL: "bg-blue-50 text-blue-700",
  GRUPO:      "bg-violet-50 text-violet-700",
  EMPRESA:    "bg-emerald-50 text-emerald-700",
  COLEGIO:    "bg-amber-50 text-amber-700",
};

const MEMBRESIAS = [
  { key: "", label: "— Sin membresía —" },
  { key: "ESPECTADOR", label: "Espectador (10% desc.)" },
  { key: "FANATICO",   label: "Fanático (20% + ensayo)" },
  { key: "MECENAS",    label: "Mecenas (naming)" },
];

const MEMBRESIA_COLOR: Record<string, string> = {
  ESPECTADOR: "bg-slate-100 text-slate-600",
  FANATICO:   "bg-blue-100 text-blue-700",
  MECENAS:    "bg-amber-100 text-amber-800",
};

const FORM_VACIO = { nombre: "", email: "", telefono: "", segmento: "INDIVIDUAL", notas: "" };
const EDIT_FORM_VACIO = { nombre: "", email: "", telefono: "", segmento: "INDIVIDUAL", nivelMembresia: "", notas: "" };

export default function AudienciaPage() {
  const [espectadores, setEspectadores] = useState<Espectador[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EDIT_FORM_VACIO);
  const [form, setForm] = useState(FORM_VACIO);
  const [filtroRecencia, setFiltroRecencia] = useState<Recencia | "TODOS">("TODOS");
  const [npsPendientesCount, setNpsPendientesCount] = useState(0);

  async function cargar(q = "") {
    setCargando(true);
    const res = await fetch(`/api/espectadores?q=${encodeURIComponent(q)}`);
    setEspectadores(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);
  useEffect(() => {
    fetch("/api/nps-pendientes").then(r => r.json()).then(d => setNpsPendientesCount(Array.isArray(d) ? d.length : 0));
  }, []);

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/espectadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo crear el espectador. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setForm(FORM_VACIO);
    setMostrarForm(false);
    cargar(busqueda);
  }

  function iniciarEdicion(esp: Espectador) {
    setEditandoId(esp.id);
    setEditForm({ nombre: esp.nombre, email: esp.email ?? "", telefono: esp.telefono ?? "", segmento: esp.segmento, nivelMembresia: esp.nivelMembresia ?? "", notas: esp.notas ?? "" });
  }

  async function handleGuardarEdicion(id: string) {
    setGuardando(true);
    const res = await fetch(`/api/espectadores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setGuardando(false);
    if (!res.ok) {
      alert("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setEditandoId(null);
    cargar(busqueda);
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este espectador?")) return;
    const res = await fetch(`/api/espectadores/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    cargar(busqueda);
  }

  async function exportar() {
    setExportando(true);
    const res = await fetch("/api/exportar/audiencia");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audiencia-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  const conEmail = espectadores.filter(e => e.email).length;
  const conNps   = espectadores.filter(e => e._count.npsList > 0).length;

  // Tasa de recompra: de los espectadores con al menos una asistencia en los
  // últimos 90 días, qué % tiene 2 o más asistencias dentro de esa misma
  // ventana — mide retención real, no solo "alguna vez volvió".
  const hace90dias = Date.now() - 90 * 86_400_000;
  const asistenciasRecientesPorEsp = espectadores.map(e =>
    e.asistencias.filter(a => new Date(a.funcion.fecha).getTime() >= hace90dias).length
  );
  const conAlMenosUna90d = asistenciasRecientesPorEsp.filter(n => n >= 1).length;
  const conDosOMas90d = asistenciasRecientesPorEsp.filter(n => n >= 2).length;
  const tasaRecompra = conAlMenosUna90d > 0 ? Math.round((conDosOMas90d / conAlMenosUna90d) * 100) : 0;

  const espectadoresFiltrados = filtroRecencia === "TODOS"
    ? espectadores
    : espectadores.filter(e => segmentoRecencia(e) === filtroRecencia);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Audiencia</h1>
        <p className="text-slate-500 text-sm mt-1">Espectadores y público de tus eventos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <KpiCard label="Total espectadores" valor={espectadores.length} icon={IconUsers} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Tasa de recompra" valor={`${tasaRecompra}%`} icon={IconRefresh}
          color={tasaRecompra >= 25 ? "bg-emerald-500" : "bg-red-500"}
          iconBg={tasaRecompra >= 25 ? "bg-emerald-50" : "bg-red-50"}
          iconColor={tasaRecompra >= 25 ? "text-emerald-600" : "text-red-500"}
          sub="2+ visitas en 90 días · meta ≥25%" />
        <KpiCard label="Con email" valor={conEmail} icon={IconMail} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" sub="Alcanzables por campaña" />
        <KpiCard label="Con NPS registrado" valor={conNps} icon={IconStar} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Empresas / Colegios" valor={espectadores.filter(e => e.segmento === "EMPRESA" || e.segmento === "COLEGIO").length}
          icon={IconBuilding} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" sub="Potencial B2B" />
      </div>

      <div className="flex gap-1.5 mb-4">
        {(["TODOS", "A", "B", "C"] as const).map(r => (
          <button key={r} onClick={() => setFiltroRecencia(r)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtroRecencia === r ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {r === "TODOS" ? "Todos" : RECENCIA_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="relative">
          <input type="text" placeholder="Buscar espectador..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-72 rounded-xl border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500" />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <IconX size={16} stroke={1.75} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/audiencia/nps-pendientes"
            className="relative flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <IconMessageCircle size={16} stroke={1.75} />Cola de NPS
            {npsPendientesCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 leading-none">{npsPendientesCount}</span>
            )}
          </Link>
          <button onClick={exportar} disabled={exportando || espectadores.length === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            <IconDownload size={16} stroke={1.75} />{exportando ? "Generando..." : "Exportar Excel"}
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            <IconPlus size={16} stroke={2} />Nuevo espectador
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Nuevo espectador</h2>
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Segmento</label>
              <select value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                {SEGMENTOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
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
      ) : espectadoresFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">{busqueda ? "No se encontraron resultados." : "Aún no hay espectadores registrados."}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Segmento</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Membresía</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Email</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Teléfono</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Notas</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">NPS</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Recencia</th>
                <th className="px-4 py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {espectadoresFiltrados.map(e => editandoId === e.id ? (
                <tr key={e.id} className="bg-brand-50">
                  <td className="px-2 py-2">
                    <input value={editForm.nombre} onChange={ev => setEditForm({ ...editForm, nombre: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={editForm.segmento} onChange={ev => setEditForm({ ...editForm, segmento: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none">
                      {SEGMENTOS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={editForm.nivelMembresia} onChange={ev => setEditForm({ ...editForm, nivelMembresia: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none">
                      {MEMBRESIAS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input type="email" value={editForm.email} onChange={ev => setEditForm({ ...editForm, email: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={editForm.telefono} onChange={ev => setEditForm({ ...editForm, telefono: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <input value={editForm.notas} onChange={ev => setEditForm({ ...editForm, notas: ev.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2 text-slate-400">{e._count.npsList > 0 ? `${e._count.npsList} resp.` : "—"}</td>
                  <td className="px-2 py-2 text-slate-400">—</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleGuardarEdicion(e.id)} disabled={guardando}
                        className="rounded-lg bg-accent-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
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
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1 font-medium text-slate-900">
                    <a href={`/dashboard/audiencia/${e.id}`} className="hover:text-brand-600 hover:underline">{e.nombre}</a>
                  </td>
                  <td className="px-4 py-1">
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${SEG_COLOR[e.segmento]}`}>
                      {SEGMENTOS.find(s => s.key === e.segmento)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-1">
                    {e.nivelMembresia ? (
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${MEMBRESIA_COLOR[e.nivelMembresia]}`}>
                        {MEMBRESIAS.find(m => m.key === e.nivelMembresia)?.label.replace(/\s*\(.+\)/, "")}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-1 text-slate-500">{e.email ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-400 text-xs max-w-[160px] truncate">{e.notas ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e._count.npsList > 0 ? `${e._count.npsList} resp.` : "—"}</td>
                  <td className="px-4 py-1">
                    {(() => {
                      const rec = segmentoRecencia(e);
                      return rec ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RECENCIA_COLOR[rec]}`}>{RECENCIA_LABEL[rec]}</span>
                      ) : <span className="text-slate-300 text-xs">Sin visitas</span>;
                    })()}
                  </td>
                  <td className="px-4 py-1">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => iniciarEdicion(e)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">
                        Editar
                      </button>
                      <button onClick={() => handleEliminar(e.id)}
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
            {espectadoresFiltrados.length} espectadores{busqueda ? ` · búsqueda: "${busqueda}"` : ""}
          </div>
        </div>
      )}
    </div>
  );
}


