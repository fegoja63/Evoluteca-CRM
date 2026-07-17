"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { KpiCard } from "@/components/kpi-card";
import { MoneyInput } from "@/components/money-input";
import { Pager } from "@/components/pager";
import {
  IconTheater, IconArmchair, IconCoin, IconStar, IconDownload, IconPlus,
  IconAlertTriangle,
} from "@tabler/icons-react";

const TAKE = 30;

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

// Días de la semana en convención JS getDay() (0=domingo … 6=sábado),
// ordenados de lunes a domingo para mostrarlos como L M X J V S D.
const DIAS = [
  { n: 1, label: "L" }, { n: 2, label: "M" }, { n: 3, label: "X" }, { n: 4, label: "J" },
  { n: 5, label: "V" }, { n: 6, label: "S" }, { n: 0, label: "D" },
];

const TEMP_VACIO = {
  titulo: "", desde: "", hasta: "", dias: [] as number[], horarios: ["19:00"] as string[],
  sillasTotales: "239", canal: "PLATAFORMA", ingresoEstimado: "", notas: "",
};

type TempForm = typeof TEMP_VACIO;

// Genera (en horario local, para el preview) todas las fechas que produciría
// el patrón de temporada. El backend regenera y valida por su cuenta; esto es
// solo para mostrar "Se crearán N funciones" antes de confirmar.
function fechasDeTemporada(t: TempForm): Date[] {
  const horarios = t.horarios.filter(Boolean);
  if (!t.desde || !t.hasta || t.dias.length === 0 || horarios.length === 0) return [];
  const inicio = new Date(`${t.desde}T00:00:00`);
  const fin = new Date(`${t.hasta}T00:00:00`);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || inicio > fin) return [];
  const horariosUnicos = Array.from(new Set(horarios)).sort();
  const out: Date[] = [];
  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    if (!t.dias.includes(d.getDay())) continue;
    for (const h of horariosUnicos) {
      const [hh, mm] = h.split(":");
      const f = new Date(d);
      f.setHours(Number(hh), Number(mm), 0, 0);
      out.push(f);
    }
    if (out.length > 200) break; // corta el preview ante rangos absurdos
  }
  return out;
}

export default function FuncionesPage() {
  const [funciones, setFunciones] = useState<Funcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(FORM_VACIO);
  const [form, setForm] = useState(FORM_VACIO);
  const [modoNueva, setModoNueva] = useState<"unica" | "temporada">("unica");
  const [formTemp, setFormTemp] = useState<TempForm>(TEMP_VACIO);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, promOcupacion: 0, totalIngreso: 0, npsTotal: 0 });

  async function cargar(p = 1) {
    setCargando(true);
    const res = await fetch(`/api/funciones?page=${p}&take=${TAKE}`);
    setFunciones(await res.json());
    setTotalCount(Number(res.headers.get("X-Total-Count") ?? 0));
    setCargando(false);
  }

  async function cargarStats() {
    const res = await fetch("/api/funciones/stats");
    setStats(await res.json());
  }

  useEffect(() => { cargar(1); cargarStats(); }, []);

  function cambiarPagina(p: number) {
    setPage(p);
    cargar(p);
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/funciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear la función. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setForm(FORM_VACIO);
    setMostrarForm(false);
    cargar(page);
    cargarStats();
  }

  async function handleCrearTemporada(e: React.FormEvent) {
    e.preventDefault();
    const fechas = fechasDeTemporada(formTemp);
    if (fechas.length === 0) {
      toast.error("El patrón no genera funciones. Revisa el rango, los días y los horarios.");
      return;
    }
    if (fechas.length > 100) {
      toast.error("La temporada generaría más de 100 funciones. Acorta el rango o reduce los horarios.");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/funciones/temporada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formTemp, horarios: formTemp.horarios.filter(Boolean) }),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear la temporada. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    const data = await res.json();
    toast.success(`Se crearon ${data.creadas} funciones de la temporada.`);
    setFormTemp(TEMP_VACIO);
    setMostrarForm(false);
    setModoNueva("unica");
    cargar(1);
    setPage(1);
    cargarStats();
  }

  function toggleDia(n: number) {
    setFormTemp(t => ({
      ...t,
      dias: t.dias.includes(n) ? t.dias.filter(d => d !== n) : [...t.dias, n],
    }));
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
    const res = await fetch(`/api/funciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setGuardando(false);
    if (!res.ok) {
      toast.error("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setEditandoId(null);
    cargar(page);
    cargarStats();
  }

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta función?")) return;
    const res = await fetch(`/api/funciones/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    cargar(page);
    cargarStats();
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

  // Alerta visual: función a <=5 días con ocupación <60% (mismo umbral del
  // plan de 90 días — "campaña de urgencia" antes de que sea tarde).
  function necesitaUrgencia(f: Funcion) {
    const dias = (new Date(f.fecha).getTime() - Date.now()) / 86_400_000;
    return dias >= 0 && dias <= 5 && ocupacion(f) < 60;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Funciones</h1>
        <p className="text-slate-500 text-sm mt-1">Registro de ocupación por función o evento</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total funciones" valor={stats.total} icon={IconTheater} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Ocupación promedio" valor={`${stats.promOcupacion}%`} icon={IconArmchair}
          color={stats.promOcupacion >= 70 ? "bg-emerald-500" : stats.promOcupacion >= 40 ? "bg-amber-500" : "bg-red-500"}
          iconBg={stats.promOcupacion >= 70 ? "bg-emerald-50" : stats.promOcupacion >= 40 ? "bg-amber-50" : "bg-red-50"}
          iconColor={stats.promOcupacion >= 70 ? "text-emerald-600" : stats.promOcupacion >= 40 ? "text-amber-600" : "text-red-500"} />
        <KpiCard label="Ingresos registrados" valor={fmt(String(stats.totalIngreso))} icon={IconCoin} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Respuestas NPS" valor={stats.npsTotal} icon={IconStar} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="text-xs text-slate-400">{totalCount} funciones registradas</div>
        <div className="flex gap-2">
          <button onClick={exportar} disabled={exportando || totalCount === 0}
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
            <IconDownload size={16} stroke={1.75} />{exportando ? "Generando..." : "Exportar Excel"}
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            <IconPlus size={16} stroke={2} />Registrar función
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Nueva función</h2>
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-semibold">
              <button type="button" onClick={() => setModoNueva("unica")}
                className={`rounded-md px-3 py-1 transition-colors ${modoNueva === "unica" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                Función única
              </button>
              <button type="button" onClick={() => setModoNueva("temporada")}
                className={`rounded-md px-3 py-1 transition-colors ${modoNueva === "temporada" ? "bg-brand-600 text-white shadow-sm" : "font-semibold text-brand-700 hover:text-brand-800"}`}>
                Temporada
              </button>
            </div>
          </div>
          {modoNueva === "unica" ? (
          <form onSubmit={handleCrear} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título / Obra *</label>
              <input required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha y hora *</label>
              <input required type="datetime-local" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Canal de venta</label>
              <select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                {CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas totales</label>
              <input type="number" value={form.sillasTotales} onChange={e => setForm({ ...form, sillasTotales: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas vendidas</label>
              <input type="number" value={form.sillasVendidas} onChange={e => setForm({ ...form, sillasVendidas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Ingreso estimado (COP)</label>
              <MoneyInput value={form.ingresoEstimado} onChange={v => setForm({ ...form, ingresoEstimado: v })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
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
          ) : (
          <form onSubmit={handleCrearTemporada} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <p className="col-span-1 sm:col-span-2 -mt-1 text-xs text-slate-500">
              Crea todas las funciones de una temporada de una vez. Cada una queda editable por separado, con su propia ocupación y NPS.
            </p>
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título / Obra *</label>
              <input required value={formTemp.titulo} onChange={e => setFormTemp({ ...formTemp, titulo: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Desde *</label>
              <input required type="date" value={formTemp.desde} onChange={e => setFormTemp({ ...formTemp, desde: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Hasta *</label>
              <input required type="date" value={formTemp.hasta} onChange={e => setFormTemp({ ...formTemp, hasta: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Días de la semana *</label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map(d => (
                  <button key={d.n} type="button" onClick={() => toggleDia(d.n)}
                    className={`h-9 w-9 rounded-lg border text-sm font-medium ${formTemp.dias.includes(d.n)
                      ? "border-accent-600 bg-accent-600 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Horarios *</label>
              <div className="flex flex-wrap items-center gap-2">
                {formTemp.horarios.map((h, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <input type="time" value={h}
                      onChange={e => setFormTemp(t => ({ ...t, horarios: t.horarios.map((x, j) => j === i ? e.target.value : x) }))}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
                    {formTemp.horarios.length > 1 && (
                      <button type="button" title="Quitar horario"
                        onClick={() => setFormTemp(t => ({ ...t, horarios: t.horarios.filter((_, j) => j !== i) }))}
                        className="text-slate-300 hover:text-red-500">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setFormTemp(t => ({ ...t, horarios: [...t.horarios, ""] }))}
                  className="rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100">
                  + Agregar horario
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Canal de venta</label>
              <select value={formTemp.canal} onChange={e => setFormTemp({ ...formTemp, canal: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                {CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sillas totales</label>
              <input type="number" value={formTemp.sillasTotales} onChange={e => setFormTemp({ ...formTemp, sillasTotales: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Ingreso estimado por función (COP)</label>
              <MoneyInput value={formTemp.ingresoEstimado} onChange={v => setFormTemp({ ...formTemp, ingresoEstimado: v })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notas (se copian a todas)</label>
              <input value={formTemp.notas} onChange={e => setFormTemp({ ...formTemp, notas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {(() => {
              const fechas = fechasDeTemporada(formTemp);
              if (fechas.length === 0) return null;
              const excede = fechas.length > 100;
              return (
                <div className={`col-span-1 sm:col-span-2 rounded-lg border px-3 py-2 text-xs ${excede
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-brand-200 bg-brand-50 text-brand-700"}`}>
                  {excede
                    ? `Se generarían más de 100 funciones (${fechas.length}). Acorta el rango o reduce los horarios.`
                    : <>Se crearán <strong>{fechas.length} funciones</strong>. Primera: {fechas[0].toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · Última: {fechas[fechas.length - 1].toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
                </div>
              );
            })()}
            <div className="col-span-1 sm:col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Generando..." : "Generar temporada"}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </form>
          )}
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
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Función / Obra</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Fecha</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Ocupación</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Canal</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Ingreso estimado</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">NPS</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Notas</th>
                <th className="px-4 py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funciones.map(f => editandoId === f.id ? (
                <tr key={f.id} className="bg-brand-50">
                  <td className="px-2 py-2">
                    <input value={editForm.titulo} onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="datetime-local" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <input type="number" placeholder="Vendidas" value={editForm.sillasVendidas}
                        onChange={e => setEditForm({ ...editForm, sillasVendidas: e.target.value })}
                        className="w-16 rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                      <span className="text-slate-400 text-xs self-center">/</span>
                      <input type="number" placeholder="Total" value={editForm.sillasTotales}
                        onChange={e => setEditForm({ ...editForm, sillasTotales: e.target.value })}
                        className="w-16 rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <select value={editForm.canal} onChange={e => setEditForm({ ...editForm, canal: e.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none">
                      {CANALES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <MoneyInput value={editForm.ingresoEstimado}
                      onChange={v => setEditForm({ ...editForm, ingresoEstimado: v })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2 text-slate-400">{f._count.npsList > 0 ? `${f._count.npsList} resp.` : "—"}</td>
                  <td className="px-2 py-2">
                    <input value={editForm.notas} onChange={e => setEditForm({ ...editForm, notas: e.target.value })}
                      className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm outline-none" />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleGuardarEdicion(f.id)} disabled={guardando}
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
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1 font-medium text-slate-900">
                    <a href={`/dashboard/funciones/${f.id}`} className="hover:text-brand-600 hover:underline">{f.titulo}</a>
                    {necesitaUrgencia(f) && (
                      <span title="Ocupación baja a menos de 5 días" className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <IconAlertTriangle size={10} stroke={2} />urgente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-1 text-slate-500 whitespace-nowrap">
                    {new Date(f.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${ocupacion(f) >= 70 ? "bg-emerald-500" : ocupacion(f) >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${ocupacion(f)}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 font-medium">{ocupacion(f)}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{f.sillasVendidas}/{f.sillasTotales}</p>
                  </td>
                  <td className="px-4 py-1 text-slate-500">{CANALES.find(c => c.key === f.canal)?.label}</td>
                  <td className="px-4 py-1 font-medium text-slate-700">{fmt(f.ingresoEstimado)}</td>
                  <td className="px-4 py-1 text-slate-500">{f._count.npsList > 0 ? `${f._count.npsList} resp.` : "—"}</td>
                  <td className="px-4 py-1 text-slate-400 text-xs max-w-[140px] truncate">{f.notas ?? "—"}</td>
                  <td className="px-4 py-1">
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
          <Pager page={page} take={TAKE} total={totalCount} onChange={cambiarPagina} />
        </div>
      )}
    </div>
  );
}


