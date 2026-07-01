"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";

type Actividad = {
  id: string;
  tipo: string;
  titulo: string;
  fecha: string;
  completada: boolean;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  oportunidad: { id: string; titulo: string } | null;
};

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string };
type Oportunidad = { id: string; titulo: string };

const TIPOS = [
  { key: "TAREA", label: "Tarea" },
  { key: "LLAMADA", label: "Llamada" },
  { key: "REUNION", label: "Reunión" },
  { key: "EMAIL", label: "Email" },
];

export default function AgendaPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [filtro, setFiltro] = useState<"pendientes" | "todas">("pendientes");

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/agenda");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }
  const [form, setForm] = useState({
    tipo: "TAREA", titulo: "", fecha: "", notas: "", empresaId: "", contactoId: "", oportunidadId: "",
  });

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/actividades");
    const data = await res.json();
    setActividades(data);
    setCargando(false);
  }

  async function cargarRelaciones() {
    const [resEmp, resCon, resOp] = await Promise.all([
      fetch("/api/empresas"),
      fetch("/api/contactos"),
      fetch("/api/oportunidades"),
    ]);
    setEmpresas(await resEmp.json());
    setContactos(await resCon.json());
    setOportunidades(await resOp.json());
  }

  useEffect(() => { cargar(); cargarRelaciones(); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ tipo: "TAREA", titulo: "", fecha: "", notas: "", empresaId: "", contactoId: "", oportunidadId: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function toggleCompletada(id: string, completada: boolean) {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, completada } : a)));
    await fetch(`/api/actividades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada }),
    });
  }

  async function eliminarActividad(id: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    setActividades((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/actividades/${id}`, { method: "DELETE" });
  }

  function formatoFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-ES", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  const visibles = actividades.filter((a) => (filtro === "pendientes" ? !a.completada : true));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
        <p className="text-slate-500 text-sm mt-1">Tareas, llamadas y reuniones</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total actividades" valor={actividades.length} emoji="📅" color="bg-blue-500" />
        <KpiCard label="Pendientes" valor={actividades.filter(a => !a.completada).length} emoji="⏳" color="bg-amber-500" />
        <KpiCard label="Completadas" valor={actividades.filter(a => a.completada).length} emoji="✅" color="bg-emerald-500" />
        <KpiCard
          label="Vencidas"
          valor={actividades.filter(a => !a.completada && new Date(a.fecha) < new Date()).length}
          emoji="⚠️" color="bg-red-400"
          sub="Sin completar y pasadas"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div></div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {exportando ? "Exportando..." : "⬇ Excel"}
          </button>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nueva actividad
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFiltro("pendientes")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            filtro === "pendientes" ? "bg-blue-50 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFiltro("todas")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            filtro === "todas" ? "bg-blue-50 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          Todas
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nueva actividad</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Título *</label>
              <input
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {TIPOS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Fecha y hora *</label>
              <input
                required
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
              <select
                value={form.empresaId}
                onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Contacto</label>
              <select
                value={form.contactoId}
                onChange={(e) => setForm({ ...form, contactoId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin contacto</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Oportunidad</label>
              <select
                value={form.oportunidadId}
                onChange={(e) => setForm({ ...form, oportunidadId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin oportunidad</option>
                {oportunidades.map((o) => (
                  <option key={o.id} value={o.id}>{o.titulo}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-neutral-400">Cargando...</p>
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {filtro === "pendientes" ? "No tienes actividades pendientes." : "Aún no tienes actividades."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm hover:bg-neutral-50"
            >
              <input
                type="checkbox"
                checked={a.completada}
                onChange={(e) => toggleCompletada(a.id, e.target.checked)}
                className="h-4 w-4"
              />
              <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {TIPOS.find((t) => t.key === a.tipo)?.label}
              </span>
              <div className="flex-1">
                <p className={a.completada ? "text-neutral-400 line-through" : "font-medium text-neutral-900"}>
                  {a.titulo}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatoFecha(a.fecha)}
                  {a.empresa && ` · ${a.empresa.nombre}`}
                  {a.contacto && ` · ${a.contacto.nombre}`}
                  {a.oportunidad && ` · ${a.oportunidad.titulo}`}
                </p>
              </div>
              <button
                onClick={() => eliminarActividad(a.id)}
                className="text-neutral-300 hover:text-red-600"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
