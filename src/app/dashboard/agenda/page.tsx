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
  { key: "TAREA",   label: "Tarea",   dot: "bg-slate-400" },
  { key: "LLAMADA", label: "Llamada", dot: "bg-blue-500" },
  { key: "REUNION", label: "Reunión", dot: "bg-violet-500" },
  { key: "EMAIL",   label: "Email",   dot: "bg-emerald-500" },
];

const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function CalendarioActividades({
  actividades, mes, setMes, diaSeleccionado, setDiaSeleccionado, onToggle, onEliminar, formatoFecha,
}: {
  actividades: Actividad[];
  mes: { anio: number; mes: number };
  setMes: (m: { anio: number; mes: number }) => void;
  diaSeleccionado: string | null;
  setDiaSeleccionado: (d: string | null) => void;
  onToggle: (id: string, completada: boolean) => void;
  onEliminar: (id: string) => void;
  formatoFecha: (f: string) => string;
}) {
  const hoy = new Date();
  const primerDia = new Date(mes.anio, mes.mes, 1);
  const ultimoDia = new Date(mes.anio, mes.mes + 1, 0);

  // lunes=0 ... domingo=6
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const totalCeldas = Math.ceil((offsetInicio + ultimoDia.getDate()) / 7) * 7;

  function keyDia(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  // Agrupar actividades por día
  const porDia: Record<string, Actividad[]> = {};
  for (const a of actividades) {
    const k = keyDia(new Date(a.fecha));
    if (!porDia[k]) porDia[k] = [];
    porDia[k].push(a);
  }

  const actsDia = diaSeleccionado ? (porDia[diaSeleccionado] ?? []) : [];

  function navMes(delta: number) {
    const d = new Date(mes.anio, mes.mes + delta, 1);
    setMes({ anio: d.getFullYear(), mes: d.getMonth() });
    setDiaSeleccionado(null);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {/* Navegación mes */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navMes(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">← Ant.</button>
          <h2 className="text-sm font-bold text-slate-900">{MESES_NOMBRE[mes.mes]} {mes.anio}</h2>
          <button onClick={() => navMes(1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Sig. →</button>
        </div>

        {/* Cabecera días */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: totalCeldas }).map((_, i) => {
            const numDia = i - offsetInicio + 1;
            if (numDia < 1 || numDia > ultimoDia.getDate()) {
              return <div key={i} />;
            }
            const fecha = new Date(mes.anio, mes.mes, numDia);
            const k = keyDia(fecha);
            const acts = porDia[k] ?? [];
            const esHoy = keyDia(hoy) === k;
            const esSeleccionado = diaSeleccionado === k;
            const tieneVencidas = acts.some(a => !a.completada && new Date(a.fecha) < hoy);

            return (
              <button key={i} onClick={() => setDiaSeleccionado(esSeleccionado ? null : k)}
                className={`rounded-xl p-1.5 min-h-[56px] flex flex-col items-center transition-all border ${
                  esSeleccionado ? "border-blue-400 bg-blue-50" :
                  esHoy ? "border-blue-200 bg-blue-50" :
                  acts.length > 0 ? "border-slate-200 hover:border-blue-200 hover:bg-slate-50" :
                  "border-transparent hover:bg-slate-50"
                }`}>
                <span className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  esHoy ? "bg-blue-600 text-white" : "text-slate-700"
                }`}>{numDia}</span>
                {/* Puntos de actividades (max 3) */}
                {acts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {acts.slice(0, 3).map(a => {
                      const dot = TIPOS.find(t => t.key === a.tipo)?.dot ?? "bg-slate-400";
                      return (
                        <span key={a.id}
                          className={`w-1.5 h-1.5 rounded-full ${a.completada ? "bg-slate-200" : tieneVencidas && !a.completada ? "bg-red-400" : dot}`} />
                      );
                    })}
                    {acts.length > 3 && <span className="text-xs text-slate-400 leading-none">+{acts.length-3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          {TIPOS.map(t => (
            <span key={t.key} className="flex items-center gap-1 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${t.dot}`} />{t.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-400" />Vencida
          </span>
        </div>
      </div>

      {/* Panel del día seleccionado */}
      {diaSeleccionado && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 text-xs text-slate-400 font-normal">{actsDia.length} actividad{actsDia.length !== 1 ? "es" : ""}</span>
          </h3>
          {actsDia.length === 0 ? (
            <p className="text-xs text-slate-400">Sin actividades este día.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {actsDia.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
                  <input type="checkbox" checked={a.completada}
                    onChange={e => onToggle(a.id, e.target.checked)} className="h-4 w-4" />
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TIPOS.find(t=>t.key===a.tipo)?.dot ?? "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={a.completada ? "text-slate-400 line-through text-xs" : "font-medium text-slate-900 text-xs"}>
                      {a.titulo}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatoFecha(a.fecha)}
                      {a.empresa && ` · ${a.empresa.nombre}`}
                    </p>
                  </div>
                  <button onClick={() => onEliminar(a.id)}
                    className="text-slate-200 hover:text-red-500 text-base leading-none shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [mesCalendario, setMesCalendario] = useState(() => {
    const h = new Date(); return { anio: h.getFullYear(), mes: h.getMonth() };
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [notificando, setNotificando] = useState<string | null>(null);
  const [notifOk, setNotifOk] = useState<string | null>(null);

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

  async function enviarRecordatorio(a: Actividad) {
    setNotificando(a.id);
    await fetch("/api/notificaciones/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "RECORDATORIO_ACTIVIDAD",
        datos: {
          titulo: a.titulo,
          tipo: TIPOS.find(t => t.key === a.tipo)?.label ?? a.tipo,
          fecha: new Date(a.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          notas: "",
        },
      }),
    });
    setNotificando(null);
    setNotifOk(a.id);
    setTimeout(() => setNotifOk(null), 3000);
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
        {/* Toggle vista */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm">
          <button onClick={() => setVista("lista")}
            className={`px-4 py-2 font-medium transition-colors ${vista === "lista" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            ☰ Lista
          </button>
          <button onClick={() => setVista("calendario")}
            className={`px-4 py-2 font-medium transition-colors ${vista === "calendario" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            📅 Calendario
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {exportando ? "Exportando..." : "⬇ Excel"}
          </button>
          <button onClick={() => setMostrarForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Nueva actividad
          </button>
        </div>
      </div>

      {vista === "lista" && (
        <div className="mb-4 flex gap-2">
          <button onClick={() => setFiltro("pendientes")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filtro === "pendientes" ? "bg-blue-50 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
            Pendientes
          </button>
          <button onClick={() => setFiltro("todas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filtro === "todas" ? "bg-blue-50 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"}`}>
            Todas
          </button>
        </div>
      )}

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nueva actividad</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      ) : vista === "calendario" ? (
        <CalendarioActividades
          actividades={actividades}
          mes={mesCalendario}
          setMes={setMesCalendario}
          diaSeleccionado={diaSeleccionado}
          setDiaSeleccionado={setDiaSeleccionado}
          onToggle={toggleCompletada}
          onEliminar={eliminarActividad}
          formatoFecha={formatoFecha}
        />
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {filtro === "pendientes" ? "No tienes actividades pendientes." : "Aún no tienes actividades."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibles.map((a) => (
            <div key={a.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm hover:bg-neutral-50">
              <input type="checkbox" checked={a.completada}
                onChange={(e) => toggleCompletada(a.id, e.target.checked)} className="h-4 w-4" />
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
              {!a.completada && new Date(a.fecha) < new Date() && (
                <button onClick={() => enviarRecordatorio(a)} disabled={notificando === a.id}
                  className="text-amber-400 hover:text-amber-600 disabled:opacity-50" title="Enviarme recordatorio">
                  {notifOk === a.id ? "✅" : notificando === a.id ? "..." : "🔔"}
                </button>
              )}
              <button onClick={() => eliminarActividad(a.id)}
                className="text-neutral-300 hover:text-red-600" title="Eliminar">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
