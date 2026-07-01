"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/kpi-card";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  fechaEvento: string | null;
  sede: string | null;
  segmento: string | null;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string; email: string | null } | null;
};

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string; email: string | null };

const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO:   "Prospecto",
  CALIFICADO:  "Calificado",
  PROPUESTA:   "Propuesta",
  NEGOCIACION: "Negociación",
  GANADA:      "Ganada",
  PERDIDA:     "Perdida",
};

const ETAPA_COLOR: Record<string, string> = {
  PROSPECTO:   "bg-slate-100 text-slate-600",
  CALIFICADO:  "bg-blue-50 text-blue-700",
  PROPUESTA:   "bg-violet-50 text-violet-700",
  NEGOCIACION: "bg-amber-50 text-amber-700",
  GANADA:      "bg-emerald-50 text-emerald-700",
  PERDIDA:     "bg-red-50 text-red-600",
};

const ETAPA_PILL_ACTIVE: Record<string, string> = {
  PROSPECTO:   "bg-slate-700 text-white",
  CALIFICADO:  "bg-blue-600 text-white",
  PROPUESTA:   "bg-violet-600 text-white",
  NEGOCIACION: "bg-amber-500 text-white",
  GANADA:      "bg-emerald-600 text-white",
  PERDIDA:     "bg-red-500 text-white",
};

const ETAPA_PILL_INACTIVE: Record<string, string> = {
  PROSPECTO:   "bg-slate-100 text-slate-600 hover:bg-slate-200",
  CALIFICADO:  "bg-blue-50 text-blue-700 hover:bg-blue-100",
  PROPUESTA:   "bg-violet-50 text-violet-700 hover:bg-violet-100",
  NEGOCIACION: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  GANADA:      "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  PERDIDA:     "bg-red-50 text-red-600 hover:bg-red-100",
};

const FORM_VACIO = {
  titulo: "", empresaId: "", contactoId: "",
  fechaEvento: "", sede: "", segmento: "",
  valor: "", etapa: "PROPUESTA", notas: "",
};

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Oportunidad[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState("TODAS");
  const [form, setForm] = useState(FORM_VACIO);

  async function cargar() {
    setCargando(true);
    const [resOp, resEmp, resCon] = await Promise.all([
      fetch("/api/oportunidades"),
      fetch("/api/empresas"),
      fetch("/api/contactos"),
    ]);
    const [ops, emps, cons] = await Promise.all([
      resOp.json(), resEmp.json(), resCon.json(),
    ]);
    setCotizaciones(ops as Oportunidad[]);
    setEmpresas(emps);
    setContactos(cons);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        valor: form.valor || null,
        etapa: form.etapa,
        notas: form.notas || null,
        empresaId: form.empresaId || null,
        contactoId: form.contactoId || null,
      }),
    });
    setForm(FORM_VACIO);
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/oportunidades");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizaciones-activas-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  function fmt(valor: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
  }

  function fmtFecha(f: string | null) {
    if (!f) return null;
    return new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }

  const ETAPAS_EN_CURSO = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];

  const conteoEtapas = ETAPAS_ACTIVAS.reduce((acc, e) => {
    acc[e] = cotizaciones.filter(o => o.etapa === e).length;
    return acc;
  }, {} as Record<string, number>);

  const activas = cotizaciones.filter(o => ETAPAS_EN_CURSO.includes(o.etapa));
  const valorTotal = activas.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState({ empresa: "", tipoEvento: "", sede: "" });
  const [cambiandoEtapa, setCambiandoEtapa] = useState<string | null>(null);

  function setFiltro(campo: keyof typeof filtros, valor: string) {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  }

  async function cambiarEtapa(id: string, nuevaEtapa: string) {
    setCambiandoEtapa(id);
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: nuevaEtapa }),
    });
    setCambiandoEtapa(null);
    cargar();
  }

  const etapasParaFiltro = ["TODAS", ...ETAPAS_ACTIVAS];

  const listado = cotizaciones.filter(o => {
    if (filtroEtapa !== "TODAS" && o.etapa !== filtroEtapa) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const enEmpresa  = o.empresa?.nombre.toLowerCase().includes(q);
      const enContacto = o.contacto?.nombre.toLowerCase().includes(q);
      const enTitulo   = o.titulo.toLowerCase().includes(q);
      if (!enEmpresa && !enContacto && !enTitulo) return false;
    }
    if (filtros.empresa && !o.empresa?.nombre.toLowerCase().includes(filtros.empresa.toLowerCase())) return false;
    if (filtros.tipoEvento && !o.titulo.toLowerCase().includes(filtros.tipoEvento.toLowerCase())) return false;
    if (filtros.sede && !(o.sede ?? "").toLowerCase().includes(filtros.sede.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones activas</h1>
          <p className="text-slate-500 text-sm mt-1">Negocios en curso — todo lo que está por cerrar o perder</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva cotización
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <KpiCard label="En negociación" valor={activas.length} emoji="🔄" color="bg-blue-500"
          sub={fmt(valorTotal) + " potencial"} />
        <KpiCard label="Prospecto" valor={conteoEtapas.PROSPECTO} emoji="🎯" color="bg-slate-500" />
        <KpiCard label="Calificado" valor={conteoEtapas.CALIFICADO} emoji="✅" color="bg-blue-400" />
        <KpiCard label="Propuesta" valor={conteoEtapas.PROPUESTA} emoji="📄" color="bg-violet-500" />
        <KpiCard label="Negociación" valor={conteoEtapas.NEGOCIACION} emoji="🤝" color="bg-amber-500" />
      </div>

      {/* Formulario nueva cotización */}
      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Nueva cotización</h2>
            <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>
          <form onSubmit={handleGuardar}>
            <div className="grid grid-cols-2 gap-3 mb-4">

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Tipo de evento / Negocio *</label>
                <input required placeholder="Ej: Graduación Universidad Nacional" value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Empresa / Cliente</label>
                <select value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Contacto</label>
                <select value={form.contactoId} onChange={e => setForm({ ...form, contactoId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  <option value="">Sin contacto</option>
                  {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.email ? ` — ${c.email}` : ""}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Fecha del evento</label>
                <input type="date" value={form.fechaEvento} onChange={e => setForm({ ...form, fechaEvento: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Sede / Sala</label>
                <input placeholder="Ej: Sala Principal" value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Valor cotizado (COP)</label>
                <input type="number" step="1000" placeholder="0" value={form.valor}
                  onChange={e => setForm({ ...form, valor: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Etapa</label>
                <select value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                  {ETAPAS_ACTIVAS.map(e => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Notas</label>
                <input placeholder="Observaciones, condiciones, etc." value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cotización"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filtros de etapa (pills) + búsqueda ── */}
      <div className="mb-4 space-y-3">
        {/* Pills de etapa */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Etapa:</span>
          <button
            onClick={() => setFiltroEtapa("TODAS")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filtroEtapa === "TODAS"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas ({cotizaciones.length})
          </button>
          {ETAPAS_ACTIVAS.map(e => {
            const n = cotizaciones.filter(o => o.etapa === e).length;
            const activo = filtroEtapa === e;
            return (
              <button
                key={e}
                onClick={() => setFiltroEtapa(activo ? "TODAS" : e)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  activo ? ETAPA_PILL_ACTIVE[e] : ETAPA_PILL_INACTIVE[e]
                }`}
              >
                {ETAPA_LABEL[e]} {n > 0 && `(${n})`}
              </button>
            );
          })}
        </div>

        {/* Búsqueda libre + Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar cliente, contacto o evento..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-base leading-none">
                ×
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {(filtros.empresa || filtros.tipoEvento || filtros.sede || busqueda) && (
              <>
                <span>{listado.length} de {cotizaciones.length}</span>
                <button onClick={() => { setFiltros({ empresa: "", tipoEvento: "", sede: "" }); setBusqueda(""); setFiltroEtapa("TODAS"); }}
                  className="text-blue-600 hover:underline">
                  × Limpiar todo
                </button>
              </>
            )}
          </div>
          <button
            onClick={exportarExcel}
            disabled={exportando || cotizaciones.length === 0}
            className="ml-auto flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {exportando ? "Generando..." : "↓ Exportar Excel"}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : listado.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500 mb-3">No hay cotizaciones activas en esta etapa.</p>
          <button onClick={() => setMostrarForm(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            + Nueva cotización
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 pt-3 pb-1 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa / Cliente</span>
                  <input value={filtros.empresa} onChange={e => setFiltro("empresa", e.target.value)}
                    placeholder="Filtrar..." className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400 font-normal normal-case tracking-normal" />
                </th>
                <th className="px-4 pt-3 pb-1 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</span>
                  <div className="mt-1 h-6" />
                </th>
                <th className="px-4 pt-3 pb-1 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de evento</span>
                  <input value={filtros.tipoEvento} onChange={e => setFiltro("tipoEvento", e.target.value)}
                    placeholder="Filtrar..." className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400 font-normal normal-case tracking-normal" />
                </th>
                <th className="px-4 pt-3 pb-1 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha evento</span>
                  <div className="mt-1 h-6" />
                </th>
                <th className="px-4 pt-3 pb-1 text-left">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sede</span>
                  <input value={filtros.sede} onChange={e => setFiltro("sede", e.target.value)}
                    placeholder="Filtrar..." className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400 font-normal normal-case tracking-normal" />
                </th>
                <th className="px-4 pt-3 pb-1 text-right">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor cotizado</span>
                  <div className="mt-1 h-6" />
                </th>
                <th className="px-4 pt-3 pb-1 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Etapa</span>
                  <div className="mt-1 h-6" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listado.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {o.empresa?.nombre ?? <span className="text-slate-400 italic text-xs">Sin empresa</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.contacto ? (
                      <div>
                        <p>{o.contacto.nombre}</p>
                        {o.contacto.email && <p className="text-xs text-slate-400">{o.contacto.email}</p>}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-[200px]">
                    <p className="truncate" title={o.titulo}>{o.titulo}</p>
                    {o.segmento && <p className="text-xs text-slate-400">{o.segmento}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {fmtFecha(o.fechaEvento) ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.sede ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                    {o.valor ? fmt(Number(o.valor)) : <span className="text-slate-400 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.etapa}
                      disabled={cambiandoEtapa === o.id}
                      onChange={e => cambiarEtapa(o.id, e.target.value)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 outline-none cursor-pointer transition-opacity ${
                        cambiandoEtapa === o.id ? "opacity-50" : ""
                      } ${ETAPA_COLOR[o.etapa]}`}
                    >
                      {ETAPAS_ACTIVAS.map(e => (
                        <option key={e} value={e}>{ETAPA_LABEL[e]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Total ({listado.length} cotizaciones)
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                  {fmt(listado.reduce((acc, o) => acc + Number(o.valor ?? 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
