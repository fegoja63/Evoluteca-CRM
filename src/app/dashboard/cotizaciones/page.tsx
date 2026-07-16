"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconFilePlus, IconSearch, IconX, IconDownload, IconChartFunnel,
  IconTarget, IconCircleCheck, IconFileText, IconArrowsExchange, IconPencil, IconTrash,
  type Icon,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { puedeEliminar } from "@/lib/permisos";
import { toast } from "@/lib/toast";
import { MoneyInput } from "@/components/money-input";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  fechaEvento: string | null;
  sede: string | null;
  segmento: string | null;
  creadoEn: string;
  extras: Record<string, string> | null;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string; email: string | null } | null;
};

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string; email: string | null };

const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO:   "Prospecto",
  CALIFICADO:  "Calificado",
  PROPUESTA:   "Cotización",
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
  const [filtroEdad, setFiltroEdad] = useState("TODAS");
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

  const ETAPAS_VIGENTES = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];
  const ETAPAS_EN_CURSO = ETAPAS_VIGENTES;

  function diasDesdeOportunidad(o: Oportunidad): number {
    const mes = o.extras?.["MES"]; // ISO date: "2024-02-01T00:00:00.000Z"
    if (mes) {
      const fecha = new Date(mes);
      if (!isNaN(fecha.getTime())) {
        return Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    return Math.floor((Date.now() - new Date(o.creadoEn).getTime()) / (1000 * 60 * 60 * 24));
  }

  function bucketEdad(dias: number) {
    if (dias < 30) return "0-30";
    if (dias <= 60) return "30-60";
    if (dias <= 90) return "61-90";
    return "+90";
  }

  const vigentes = cotizaciones.filter(o => ETAPAS_VIGENTES.includes(o.etapa));

  const conteoEdad = { "0-30": 0, "30-60": 0, "61-90": 0, "+90": 0 };
  const valorEdad  = { "0-30": 0, "30-60": 0, "61-90": 0, "+90": 0 };
  vigentes.forEach(o => {
    const b = bucketEdad(diasDesdeOportunidad(o));
    conteoEdad[b]++;
    valorEdad[b] += Number(o.valor ?? 0);
  });

  const BUCKETS = [
    { key: "0-30",  label: "< 30 días",   color: "bg-emerald-500", colorBar: "#10b981", colorPill: "bg-emerald-50 text-emerald-700", colorPillActive: "bg-emerald-600 text-white" },
    { key: "30-60", label: "30 – 60 días", color: "bg-amber-400",   colorBar: "#f59e0b", colorPill: "bg-amber-50 text-amber-700",   colorPillActive: "bg-amber-500 text-white"   },
    { key: "61-90", label: "61 – 90 días", color: "bg-orange-500",  colorBar: "#f97316", colorPill: "bg-orange-50 text-orange-700", colorPillActive: "bg-orange-500 text-white"  },
    { key: "+90",   label: "+ 90 días",    color: "bg-red-500",     colorBar: "#ef4444", colorPill: "bg-red-50 text-red-700",       colorPillActive: "bg-red-600 text-white"     },
  ];

  const maxConteo = Math.max(...BUCKETS.map(b => conteoEdad[b.key as keyof typeof conteoEdad]), 1);

  const conteoEtapas = ETAPAS_ACTIVAS.reduce((acc, e) => {
    acc[e] = cotizaciones.filter(o => o.etapa === e).length;
    return acc;
  }, {} as Record<string, number>);

  const valorEtapas = ETAPAS_ACTIVAS.reduce((acc, e) => {
    acc[e] = cotizaciones.filter(o => o.etapa === e).reduce((s, o) => s + Number(o.valor ?? 0), 0);
    return acc;
  }, {} as Record<string, number>);

  const activas = cotizaciones.filter(o => ETAPAS_EN_CURSO.includes(o.etapa));
  const valorTotal = activas.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const [busqueda, setBusqueda] = useState("");
  const [cambiandoEtapa, setCambiandoEtapa] = useState<string | null>(null);
  const [editando, setEditando] = useState<Oportunidad | null>(null);
  const [formEdit, setFormEdit] = useState({ titulo: "", empresaId: "", contactoId: "", valor: "", etapa: "PROPUESTA" });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const { data: session } = useSession();
  const puedeBorrar = puedeEliminar(session?.user?.rol);

  async function handleEliminar(o: Oportunidad) {
    if (!confirm(`¿Eliminar la cotización "${o.titulo}"? Se moverá a la Papelera y podrás restaurarla desde ahí.`)) return;
    try {
      const res = await fetch(`/api/oportunidades/${o.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    cargar();
  }

  function abrirEdicion(o: Oportunidad) {
    setEditando(o);
    setFormEdit({
      titulo: o.titulo,
      empresaId: o.empresa?.id ?? "",
      contactoId: o.contacto?.id ?? "",
      valor: o.valor ?? "",
      etapa: o.etapa,
    });
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const res = await fetch(`/api/oportunidades/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: formEdit.titulo,
          empresaId: formEdit.empresaId || null,
          contactoId: formEdit.contactoId || null,
          valor: formEdit.valor === "" ? null : formEdit.valor,
          etapa: formEdit.etapa,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
        setGuardandoEdit(false);
        return;
      }
    } catch {
      toast.error("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      setGuardandoEdit(false);
      return;
    }
    setEditando(null);
    setGuardandoEdit(false);
    cargar();
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
    if (filtroEdad !== "TODAS") {
      if (!ETAPAS_VIGENTES.includes(o.etapa)) return false;
      if (bucketEdad(diasDesdeOportunidad(o)) !== filtroEdad) return false;
    }
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const campos = [
        o.titulo,
        o.empresa?.nombre,
        o.contacto?.nombre,
        o.sede,
        o.extras?.["COTIZACION NUMERO"],
        o.extras?.["TIPO SERVICIO"],
        o.extras?.["AÑO"],
        o.extras?.["MES ELABORACION"],
      ].filter(Boolean).map(v => v!.toLowerCase());
      if (!campos.some(c => c.includes(q))) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones activas</h1>
          <p className="text-slate-500 text-sm mt-1">Negocios en curso — todo lo que está por cerrar o perder</p>
        </div>
        <Link href="/dashboard/cotizaciones-formales/nueva"
          className="inline-flex items-center gap-1.5 self-start rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 sm:self-auto">
          <IconFilePlus size={16} stroke={1.75} />
          Nueva cotización
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {([
          { label: "En negociación", valor: activas.length, sub: fmt(valorTotal) + " potencial", icon: IconChartFunnel, ibg: "bg-brand-50", itxt: "text-brand-600" },
          { label: "Prospecto", valor: conteoEtapas.PROSPECTO, sub: valorEtapas.PROSPECTO > 0 ? fmt(valorEtapas.PROSPECTO) : undefined, icon: IconTarget, ibg: "bg-slate-100", itxt: "text-slate-600" },
          { label: "Calificado", valor: conteoEtapas.CALIFICADO, sub: valorEtapas.CALIFICADO > 0 ? fmt(valorEtapas.CALIFICADO) : undefined, icon: IconCircleCheck, ibg: "bg-blue-50", itxt: "text-blue-600" },
          { label: "Cotización", valor: conteoEtapas.PROPUESTA, sub: valorEtapas.PROPUESTA > 0 ? fmt(valorEtapas.PROPUESTA) : undefined, icon: IconFileText, ibg: "bg-violet-50", itxt: "text-violet-600" },
          { label: "Negociación", valor: conteoEtapas.NEGOCIACION, sub: valorEtapas.NEGOCIACION > 0 ? fmt(valorEtapas.NEGOCIACION) : undefined, icon: IconArrowsExchange, ibg: "bg-amber-50", itxt: "text-amber-600" },
        ] as { label: string; valor: number; sub?: string; icon: Icon; ibg: string; itxt: string }[]).map(k => {
          const Icono = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.ibg}`}>
                  <Icono size={18} stroke={1.75} className={k.itxt} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{k.valor}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{k.label}</p>
              {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* ── Antigüedad de cotizaciones vigentes ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Antigüedad de cotizaciones vigentes</h2>
            <p className="text-xs text-slate-400 mt-0.5">Solo incluye cotizaciones activas (excluye ganadas y perdidas)</p>
          </div>
          {filtroEdad !== "TODAS" && (
            <button onClick={() => setFiltroEdad("TODAS")} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
              <IconX size={12} stroke={2.5} />
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {BUCKETS.map(b => {
            const n = conteoEdad[b.key as keyof typeof conteoEdad];
            const v = valorEdad[b.key as keyof typeof valorEdad];
            const pct = Math.round((n / maxConteo) * 100);
            const activo = filtroEdad === b.key;
            return (
              <button
                key={b.key}
                onClick={() => { setFiltroEdad(activo ? "TODAS" : b.key); setFiltroEtapa("TODAS"); }}
                className={`text-left rounded-xl p-4 border-2 transition-all ${
                  activo ? "border-brand-500 bg-brand-50" : "border-slate-100 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500">{b.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activo ? "bg-accent-600 text-white" : b.colorPill}`}>
                    {n}
                  </span>
                </div>
                {/* Barra */}
                <div className="w-full h-2 bg-slate-100 rounded-full mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${b.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">{fmt(v)}</p>
              </button>
            );
          })}
        </div>

        {/* Gráfica de barras SVG */}
        {vigentes.length > 0 && (
          <div className="mt-5">
            <svg viewBox="0 0 480 120" className="w-full" style={{ height: 120 }}>
              {BUCKETS.map((b, i) => {
                const n = conteoEdad[b.key as keyof typeof conteoEdad];
                const barH = maxConteo > 0 ? Math.round((n / maxConteo) * 80) : 0;
                const x = 20 + i * 115;
                const y = 95 - barH;
                return (
                  <g key={b.key}>
                    <rect x={x} y={y} width={80} height={barH} rx={6} fill={b.colorBar}
                      opacity={filtroEdad === "TODAS" || filtroEdad === b.key ? 1 : 0.3} />
                    <text x={x + 40} y={y - 5} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#334155">
                      {n > 0 ? n : ""}
                    </text>
                    <text x={x + 40} y={110} textAnchor="middle" fontSize={10} fill="#94a3b8">
                      {b.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Formulario nueva cotización */}
      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Nueva cotización</h2>
            <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-slate-600">
              <IconX size={18} stroke={1.75} />
            </button>
          </div>
          <form onSubmit={handleGuardar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Tipo de evento / Negocio *</label>
                <input required placeholder="Ej: Graduación Universidad Nacional" value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Empresa / Cliente</label>
                <select value={form.empresaId} onChange={e => setForm({ ...form, empresaId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Contacto</label>
                <select value={form.contactoId} onChange={e => setForm({ ...form, contactoId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin contacto</option>
                  {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.email ? ` — ${c.email}` : ""}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Fecha del evento</label>
                <input type="date" value={form.fechaEvento} onChange={e => setForm({ ...form, fechaEvento: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Sede / Sala</label>
                <input placeholder="Ej: Sala Principal" value={form.sede} onChange={e => setForm({ ...form, sede: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Valor cotizado (COP)</label>
                <MoneyInput placeholder="0" value={form.valor}
                  onChange={v => setForm({ ...form, valor: v })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-500">Etapa</label>
                <select value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  {ETAPAS_ACTIVAS.map(e => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Notas</label>
                <input placeholder="Observaciones, condiciones, etc." value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
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
            onClick={() => { setFiltroEtapa("TODAS"); setFiltroEdad("TODAS"); }}
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
                onClick={() => { setFiltroEtapa(activo ? "TODAS" : e); setFiltroEdad("TODAS"); }}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <IconSearch size={15} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, evento, N° cotización, mes, año..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <IconX size={14} stroke={2} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(busqueda || filtroEtapa !== "TODAS") && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{listado.length} de {cotizaciones.length}</span>
                <button onClick={() => { setBusqueda(""); setFiltroEtapa("TODAS"); }}
                  className="flex items-center gap-1 text-brand-600 hover:underline">
                  <IconX size={12} stroke={2.5} />
                  Limpiar todo
                </button>
              </div>
            )}
            <button
              onClick={exportarExcel}
              disabled={exportando || cotizaciones.length === 0}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              <IconDownload size={16} stroke={1.75} />
              {exportando ? "Generando..." : "Exportar Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : listado.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <p className="text-sm text-slate-500 mb-3">No hay cotizaciones activas en esta etapa.</p>
          <Link href="/dashboard/cotizaciones-formales/nueva"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            <IconFilePlus size={16} stroke={1.75} />
            Nueva cotización
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-1 text-left">N° Cotización</th>
                <th className="px-4 py-1 text-left">Empresa / Cliente</th>
                <th className="px-4 py-1 text-left">Tipo de evento</th>
                <th className="px-4 py-1 text-left">Mes / Año</th>
                <th className="px-4 py-1 text-left">Trimestre</th>
                <th className="px-4 py-1 text-right">Valor cotizado</th>
                <th className="px-4 py-1 text-center">Etapa</th>
                <th className="px-4 py-1 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listado.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-1 whitespace-nowrap">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      {o.extras?.["COTIZACION NUMERO"]
                        ? <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg">{o.extras["COTIZACION NUMERO"]}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-1">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      <p className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                        {o.empresa?.nombre ?? <span className="text-slate-400 italic text-xs">Sin empresa</span>}
                      </p>
                      {o.contacto && <p className="text-xs text-slate-400 mt-0.5">{o.contacto.nombre}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-700 max-w-[200px]">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      <p className="truncate" title={o.titulo}>{o.titulo}</p>
                      {o.extras?.["TIPO SERVICIO"] && <p className="text-xs text-slate-400">{o.extras["TIPO SERVICIO"]}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-600 whitespace-nowrap text-sm">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      {o.extras?.["MES ELABORACION"] && o.extras?.["AÑO"]
                        ? `${o.extras["MES ELABORACION"]} ${o.extras["AÑO"]}`
                        : <span className="text-slate-400">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-500 text-xs">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      {o.extras?.["TRIMESTRE"] ?? <span className="text-slate-400">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-right font-semibold text-slate-900 whitespace-nowrap">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="block">
                      {o.valor ? fmt(Number(o.valor)) : <span className="text-slate-400 font-normal">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-center">
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
                  <td className="px-4 py-1 text-center">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => abrirEdicion(o)} title="Editar cotización"
                        className="text-slate-300 hover:text-brand-600 inline-flex">
                        <IconPencil size={15} stroke={1.75} />
                      </button>
                      {puedeBorrar && (
                        <button onClick={() => handleEliminar(o)} title="Eliminar cotización"
                          className="text-slate-300 hover:text-red-600 inline-flex">
                          <IconTrash size={15} stroke={1.75} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={5} className="px-4 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Total ({listado.length} cotizaciones)
                </td>
                <td className="px-4 py-1 text-right font-bold text-slate-900 whitespace-nowrap">
                  {fmt(listado.reduce((acc, o) => acc + Number(o.valor ?? 0), 0))}
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditando(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Editar cotización</h2>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <IconX size={18} stroke={1.75} />
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Tipo de evento / Negocio *</label>
                <input required value={formEdit.titulo}
                  onChange={e => setFormEdit({ ...formEdit, titulo: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Empresa / Cliente</label>
                <select value={formEdit.empresaId} onChange={e => setFormEdit({ ...formEdit, empresaId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin empresa</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Contacto</label>
                <select value={formEdit.contactoId} onChange={e => setFormEdit({ ...formEdit, contactoId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin contacto</option>
                  {contactos.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.email ? ` — ${c.email}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Valor cotizado (COP)</label>
                <MoneyInput placeholder="0" value={formEdit.valor}
                  onChange={v => setFormEdit({ ...formEdit, valor: v })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Etapa</label>
                <select value={formEdit.etapa} onChange={e => setFormEdit({ ...formEdit, etapa: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  {ETAPAS_ACTIVAS.map(e => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditando(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEdit}
                  className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


