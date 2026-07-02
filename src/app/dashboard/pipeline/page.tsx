"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  creadoEn: string;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  extras: Record<string, string> | null;
};

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
}

function urgenciaBorde(dias: number, etapa: string): string {
  if (etapa === "GANADA" || etapa === "PERDIDA") return "";
  if (dias < 15) return "border-l-4 border-l-emerald-400";
  if (dias < 30) return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-red-400";
}

function urgenciaBadge(dias: number, etapa: string): string | null {
  if (etapa === "GANADA" || etapa === "PERDIDA") return null;
  return `${dias}d`;
}

function urgenciaBadgeColor(dias: number): string {
  if (dias < 15) return "text-emerald-600 bg-emerald-50";
  if (dias < 30) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string };

const ETAPAS = [
  { key: "PROSPECTO",   label: "Prospecto",   color: "border-t-slate-400",   badge: "bg-slate-100 text-slate-600" },
  { key: "CALIFICADO",  label: "Calificado",  color: "border-t-blue-400",    badge: "bg-blue-50 text-blue-700" },
  { key: "PROPUESTA",   label: "Cotización",  color: "border-t-violet-400",  badge: "bg-violet-50 text-violet-700" },
  { key: "NEGOCIACION", label: "Negociación", color: "border-t-amber-400",   badge: "bg-amber-50 text-amber-700" },
  { key: "GANADA",      label: "Ganada",      color: "border-t-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
  { key: "PERDIDA",     label: "Perdida",     color: "border-t-red-400",     badge: "bg-red-50 text-red-600" },
];

const MESES_LABEL: Record<string, number> = {
  ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6,
  JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12,
};

const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function PipelinePage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [empresas, setEmpresas]   = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando]   = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<string | null>(null);
  const [busqueda, setBusqueda]   = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");
  const [filtroMes, setFiltroMes]   = useState("");
  const [form, setForm] = useState({
    titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "",
  });

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/oportunidades");
    setOportunidades(await res.json());
    setCargando(false);
  }

  async function cargarRelaciones() {
    const [resEmp, resCon] = await Promise.all([fetch("/api/empresas"), fetch("/api/contactos")]);
    setEmpresas(await resEmp.json());
    setContactos(await resCon.json());
  }

  useEffect(() => { cargar(); cargarRelaciones(); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(id: string, etapa: string) {
    setOportunidades(prev => prev.map(o => o.id === id ? { ...o, etapa } : o));
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });
  }

  async function eliminarOportunidad(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    setOportunidades(prev => prev.filter(o => o.id !== id));
    await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
  }

  function fmt(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }
  function fmtN(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  // ── Años y meses disponibles desde extras ──
  const aniosDisponibles = Array.from(new Set(
    oportunidades.map(o => o.extras?.["AÑO"]).filter((v): v is string => !!v)
  )).sort();

  const mesesDisponibles = Array.from(new Set(
    oportunidades
      .filter(o => !filtroAnio || o.extras?.["AÑO"] === filtroAnio)
      .map(o => o.extras?.["MES ELABORACION"])
      .filter((v): v is string => !!v)
  )).sort((a, b) => (MESES_LABEL[a.toUpperCase()] ?? 13) - (MESES_LABEL[b.toUpperCase()] ?? 13));

  // ── Filtrado ──
  const filtradas = oportunidades.filter(o => {
    if (filtroAnio && o.extras?.["AÑO"] !== filtroAnio) return false;
    if (filtroMes  && o.extras?.["MES ELABORACION"]?.toUpperCase() !== filtroMes.toUpperCase()) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!o.titulo.toLowerCase().includes(q) &&
          !o.empresa?.nombre.toLowerCase().includes(q) &&
          !(o.extras?.["COTIZACION NUMERO"] ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const hayFiltro = busqueda || filtroAnio || filtroMes;

  // ── KPIs ──
  const etapasActivas = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"];
  const activas  = filtradas.filter(o => etapasActivas.includes(o.etapa));
  const ganadas  = filtradas.filter(o => o.etapa === "GANADA");
  const perdidas = filtradas.filter(o => o.etapa === "PERDIDA");
  const valorGanadas  = ganadas.reduce((acc,o)  => acc + Number(o.valor ?? 0), 0);
  const valorPerdidas = perdidas.reduce((acc,o) => acc + Number(o.valor ?? 0), 0);
  const valorActivas  = activas.reduce((acc,o)  => acc + Number(o.valor ?? 0), 0);
  const tasa = (ganadas.length + perdidas.length) > 0
    ? Math.round((ganadas.length / (ganadas.length + perdidas.length)) * 100) : 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">Pipeline</h1>
        <p className="text-slate-500 text-sm mt-1">Oportunidades de venta por etapa</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard label="En negociación activa" valor={fmtN(valorActivas)} emoji="🔄" color="bg-blue-500"
          sub={`${activas.length} oportunidades`} />
        <KpiCard label="Valor ganado" valor={fmtN(valorGanadas)} emoji="💰" color="bg-emerald-500"
          sub={`${ganadas.length} negocios cerrados`} />
        <KpiCard label="Valor perdido" valor={fmtN(valorPerdidas)} emoji="❌" color="bg-red-400"
          sub={`${perdidas.length} perdidos`} />
        <KpiCard label="Tasa de cierre" valor={`${tasa}%`} emoji="🎯" color="bg-amber-500"
          sub={`${ganadas.length} ganadas · ${perdidas.length} perdidas`} />
      </div>

      {/* ── FILTROS ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar cliente, evento o N° cotización..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-blue-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-base leading-none">×</button>
          )}
        </div>

        {/* Año */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Año:</label>
          <select value={filtroAnio} onChange={e => { setFiltroAnio(e.target.value); setFiltroMes(""); }}
            className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer">
            <option value="">Todos</option>
            {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Mes */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-slate-500">Mes:</label>
          <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            disabled={!filtroAnio}
            className="rounded-lg border border-slate-200 bg-white text-slate-900 text-sm px-2 py-2 outline-none cursor-pointer disabled:opacity-40">
            <option value="">Todos</option>
            {mesesDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Contador + limpiar */}
        {hayFiltro && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs text-slate-500">{filtradas.length} de {oportunidades.length} oportunidades</span>
            <button onClick={() => { setBusqueda(""); setFiltroAnio(""); setFiltroMes(""); }}
              className="text-xs text-blue-600 hover:underline">× Limpiar filtros</button>
          </div>
        )}
      </div>

      {/* ── FORMULARIO ── */}
      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Nueva oportunidad</h2>
            <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
          </div>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Título *</label>
              <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Valor estimado (COP)</label>
              <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Etapa</label>
              <select value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                {ETAPAS.map(et => <option key={et.key} value={et.key}>{et.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Empresa</label>
              <select value={form.empresaId} onChange={e => setForm({...form, empresaId: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">Sin empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Contacto</label>
              <select value={form.contactoId} onChange={e => setForm({...form, contactoId: e.target.value})}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">Sin contacto</option>
                {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
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

      {/* ── KANBAN ── */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {ETAPAS.map(etapa => {
            const items = filtradas.filter(o => o.etapa === etapa.key);
            const isOver = dragOverEtapa === etapa.key;
            return (
              <div key={etapa.key}
                className={`rounded-xl border-2 border-t-4 border-slate-200 ${etapa.color} p-3 transition-colors ${
                  isOver ? "bg-blue-50 border-blue-300" : "bg-slate-50"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOverEtapa(etapa.key); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverEtapa(null); }}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("oportunidadId");
                  if (id) cambiarEtapa(id, etapa.key);
                  setDraggingId(null);
                  setDragOverEtapa(null);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-700">{etapa.label}</h3>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${etapa.badge}`}>{items.length}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-0.5">
                  {items.length === 0 && (
                    <div className={`rounded-lg border-2 border-dashed py-6 text-center text-xs transition-colors ${
                      isOver ? "border-blue-300 text-blue-400 bg-blue-50" : "border-slate-200 text-slate-400"
                    }`}>
                      {isOver ? "Soltar aquí" : "Sin registros"}
                    </div>
                  )}
                  {items.map(o => {
                    const dias = diasDesde(o.creadoEn);
                    const badge = urgenciaBadge(dias, etapa.key);
                    return (
                    <div key={o.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData("oportunidadId", o.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(o.id);
                      }}
                      onDragEnd={() => { setDraggingId(null); setDragOverEtapa(null); }}
                      className={`rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm cursor-grab active:cursor-grabbing transition-opacity select-none ${urgenciaBorde(dias, etapa.key)} ${
                        draggingId === o.id ? "opacity-40" : "hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <Link href={`/dashboard/pipeline/${o.id}`}
                          className="font-semibold text-slate-900 leading-snug hover:text-blue-600 transition-colors"
                          onClick={e => { if (draggingId) e.preventDefault(); }}>
                          {o.titulo}
                        </Link>
                        <button onClick={() => eliminarOportunidad(o.id)}
                          className="text-slate-300 hover:text-red-500 shrink-0 leading-none text-base">×</button>
                      </div>
                      {o.empresa && <p className="text-slate-500 mb-1">{o.empresa.nombre}</p>}
                      {o.extras?.["COTIZACION NUMERO"] && (
                        <p className="text-slate-400 mb-1">{o.extras["COTIZACION NUMERO"]}</p>
                      )}
                      {o.extras?.["AÑO"] && (
                        <p className="text-slate-400">
                          {o.extras["AÑO"]}{o.extras["MES ELABORACION"] ? ` · ${o.extras["MES ELABORACION"]}` : ""}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        {o.valor
                          ? <p className="font-semibold text-emerald-700">{fmt(o.valor)}</p>
                          : <span />
                        }
                        {badge && (
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${urgenciaBadgeColor(dias)}`}>
                            {badge}
                          </span>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {/* Drop zone visible al final de columnas con items */}
                  {items.length > 0 && isOver && (
                    <div className="rounded-lg border-2 border-dashed border-blue-300 py-3 text-center text-xs text-blue-400">
                      Soltar aquí
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
