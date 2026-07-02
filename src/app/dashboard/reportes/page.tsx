"use client";

import { useEffect, useState } from "react";

type ResAnio = { ganadas: number; perdidas: number; activas: number; valorGanado: number; valorPerdido: number; valorActivo: number; total: number };
type ResMes  = { ganadas: number; perdidas: number; valorGanado: number; total: number };
type Meta    = { id: string; anio: number; mes: number | null; valorObjetivo: string };

type TopCliente = { nombre: string; valorGanado: number; ganadas: number; total: number };

type ForecastEtapa = { cantidad: number; valorBruto: number; valorPonderado: number; probPromedio: number };

type Reporte = {
  totalEmpresas: number;
  totalContactos: number;
  totalOportunidades: number;
  valorGanado: number;
  valorPerdido: number;
  valorActivo: number;
  cantidadActiva: number;
  ganadas: number;
  perdidas: number;
  tasaCierre: number;
  oportunidadesPorEtapa: Record<string, number>;
  valorPorEtapa: Record<string, number>;
  actividadesPendientes: number;
  aniosDisponibles: number[];
  porAnio: Record<number, ResAnio>;
  porMes: Record<number, ResMes>;
  anioParaMes: number;
  topClientes: TopCliente[];
  valorPonderado: number;
  forecastPorEtapa: Record<string, ForecastEtapa>;
  filtro: { anio: number | null; mes: number | null };
};

const ETAPAS = [
  { key: "PROSPECTO",   label: "Prospecto",   colorBar: "#94a3b8" },
  { key: "CALIFICADO",  label: "Calificado",  colorBar: "#60a5fa" },
  { key: "PROPUESTA",   label: "Cotización",  colorBar: "#8b5cf6" },
  { key: "NEGOCIACION", label: "Negociación", colorBar: "#fbbf24" },
  { key: "GANADA",      label: "Ganada",      colorBar: "#10b981" },
  { key: "PERDIDA",     label: "Perdida",     colorBar: "#f87171" },
];

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const COLORES_ANIO = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

export default function ReportesPage() {
  const [r, setR] = useState<Reporte | null>(null);
  const [anio, setAnio] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [metas, setMetas] = useState<Meta[]>([]);
  const [editMeta, setEditMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ anio: new Date().getFullYear(), mes: "", valorObjetivo: "" });

  function cargar(a = anio, m = mes) {
    const params = new URLSearchParams();
    if (a) params.set("anio", a);
    if (m) params.set("mes", m);
    fetch(`/api/reportes?${params}`).then(res => res.json()).then(setR);
  }

  function cargarMetas() {
    fetch("/api/metas").then(r => r.json()).then(setMetas);
  }

  async function guardarMeta() {
    await fetch("/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anio: metaForm.anio, mes: metaForm.mes || null, valorObjetivo: Number(metaForm.valorObjetivo) }),
    });
    setEditMeta(false);
    setMetaForm({ anio: new Date().getFullYear(), mes: "", valorObjetivo: "" });
    cargarMetas();
  }

  async function eliminarMeta(anioM: number, mesM: number | null) {
    await fetch("/api/metas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anio: anioM, mes: mesM }),
    });
    cargarMetas();
  }

  useEffect(() => { cargar(); cargarMetas(); }, []);

  function fmt(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }
  function fmtK(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
    return fmt(v);
  }

  if (!r) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );

  const maxEtapa   = Math.max(...ETAPAS.map(e => r.oportunidadesPorEtapa[e.key] ?? 0), 1);
  const totalCerradas = r.ganadas + r.perdidas;
  const aniosOrden = [...r.aniosDisponibles].sort();

  // ── Gráfica comparativa por año ──
  function GraficaAnios({ metrica, titulo, color }: { metrica: (v: ResAnio) => number; titulo: string; color: string }) {
    const datos = r!.porAnio;
    const valores = aniosOrden.map(a => metrica(datos[a] ?? { ganadas:0,perdidas:0,activas:0,valorGanado:0,valorPerdido:0,valorActivo:0,total:0 }));
    const maxVal = Math.max(...valores, 1);
    const W = 400, H = 140, barW = Math.min(40, (W - 40) / aniosOrden.length - 8), pad = 30;
    const slot = (W - pad) / aniosOrden.length;

    return (
      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">{titulo}</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {valores.map((v, i) => {
            const barH = Math.max(2, (v / maxVal) * (H - 40));
            const x = pad + i * slot + (slot - barW) / 2;
            const y = H - 28 - barH;
            return (
              <g key={aniosOrden[i]}>
                <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} opacity={anio === String(aniosOrden[i]) ? 1 : 0.55} />
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#64748b">
                  {v > 999 ? fmtK(v) : v}
                </text>
                <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {aniosOrden[i]}
                </text>
              </g>
            );
          })}
          <line x1={pad} y1={H - 28} x2={W} y2={H - 28} stroke="#e2e8f0" strokeWidth={1} />
        </svg>
      </div>
    );
  }

  // ── Gráfica mensual (siempre visible, año más reciente por defecto) ──
  function GraficaMensual() {
    if (!r) return null;
    const vals    = MESES.map((_, i) => r!.porMes[i + 1]?.valorGanado ?? 0);
    const perdidos = MESES.map((_, i) => r!.porMes[i + 1]?.perdidas   ?? 0);
    const ganados  = MESES.map((_, i) => r!.porMes[i + 1]?.ganadas    ?? 0);
    // Meta mensual para el año del gráfico
    const metaMensual = metas.find(m => m.anio === r!.anioParaMes && m.mes === null);
    const metaMes = (i: number) => metas.find(m => m.anio === r!.anioParaMes && m.mes === i + 1);
    const maxVal  = Math.max(...vals, metaMensual ? Number(metaMensual.valorObjetivo) : 0, 1);
    const W = 580, H = 150, barW = 26, pad = 24;
    const slot = (W - pad) / 12;
    const hayDatos = vals.some(v => v > 0);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Actividad mensual — {r!.anioParaMes}</p>
            <p className="text-xs text-slate-400 mt-0.5">Valor ganado · negocios cerrados por mes</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Ganado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Perdidos</span>
            <span className="flex items-center gap-1"><span className="w-8 border-t-2 border-dashed border-amber-400 inline-block" /> Meta</span>
            <button onClick={() => setEditMeta(v => !v)}
              className="ml-2 text-xs text-amber-600 border border-amber-200 rounded-lg px-2 py-0.5 hover:bg-amber-50">
              {editMeta ? "× Cerrar metas" : "🎯 Configurar metas"}
            </button>
          </div>
        </div>
        {!hayDatos ? (
          <p className="text-sm text-slate-400 text-center py-8">Sin datos para {r!.anioParaMes}</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {vals.map((v, i) => {
              const barH  = Math.max(v > 0 ? 4 : 0, (v / maxVal) * (H - 45));
              const perdH = perdidos[i] > 0 ? Math.max(4, (perdidos[i] / Math.max(...perdidos, 1)) * 20) : 0;
              const x     = pad + i * slot + (slot - barW) / 2;
              const y     = H - 30 - barH;
              const metaI = metaMes(i);
              const metaV = metaI ? Number(metaI.valorObjetivo) : (metaMensual ? Number(metaMensual.valorObjetivo) : null);
              const metaY = metaV ? H - 30 - Math.max(4, (metaV / maxVal) * (H - 45)) : null;
              return (
                <g key={i}>
                  {/* barra ganado */}
                  <rect x={x} y={y} width={barW} height={barH} rx={3} fill="#10b981" opacity={0.85} />
                  {/* indicador perdidos */}
                  {perdH > 0 && <rect x={x + 2} y={H - 29} width={barW - 4} height={perdH} rx={2} fill="#fca5a5" opacity={0.9} />}
                  {/* línea de meta */}
                  {metaY !== null && (
                    <line x1={x - 2} y1={metaY} x2={x + barW + 2} y2={metaY} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3,2" />
                  )}
                  {v > 0 && (
                    <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={7.5} fill="#059669" fontWeight="700">
                      {fmtK(v)}
                    </text>
                  )}
                  {ganados[i] > 0 && barH > 14 && (
                    <text x={x + barW / 2} y={y + 11} textAnchor="middle" fontSize={7.5} fill="white" fontWeight="700">
                      {ganados[i]}
                    </text>
                  )}
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={8} fill="#94a3b8">
                    {MESES[i]}
                  </text>
                </g>
              );
            })}
            <line x1={pad} y1={H - 30} x2={W} y2={H - 30} stroke="#e2e8f0" strokeWidth={1} />
          </svg>
        )}
      </div>
    );
  }

  // ── Funnel de conversión ──
  function Funnel() {
    const etapasFunnel = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION","GANADA"];
    const colores = ["#94a3b8","#60a5fa","#8b5cf6","#fbbf24","#10b981"];
    const vals = etapasFunnel.map(e => r!.oportunidadesPorEtapa[e] ?? 0);
    const maxV = Math.max(...vals, 1);
    const W = 260, H = 220, rowH = H / etapasFunnel.length;

    return (
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Embudo de conversión</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs mx-auto">
          {etapasFunnel.map((etapa, i) => {
            const v = vals[i];
            const ancho = Math.max(0.15, v / maxV);
            const y = i * rowH;
            const xIzq = W / 2 - (W * ancho) / 2;
            const xDer = W / 2 + (W * ancho) / 2;
            const anchoSig = i < etapasFunnel.length - 1 ? Math.max(0.15, vals[i + 1] / maxV) : ancho * 0.6;
            const xIzqSig = W / 2 - (W * anchoSig) / 2;
            const xDerSig = W / 2 + (W * anchoSig) / 2;
            const label = ETAPAS.find(e => e.key === etapa)?.label ?? etapa;
            const conv = i > 0 && vals[i - 1] > 0 ? Math.round((v / vals[i - 1]) * 100) : null;
            return (
              <g key={etapa}>
                <polygon
                  points={`${xIzq},${y + 2} ${xDer},${y + 2} ${xDerSig},${y + rowH - 2} ${xIzqSig},${y + rowH - 2}`}
                  fill={colores[i]}
                  opacity={0.85}
                />
                <text x={W / 2} y={y + rowH / 2 - 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="700">{label}</text>
                <text x={W / 2} y={y + rowH / 2 + 7} textAnchor="middle" fontSize={9} fill="white" opacity={0.9}>
                  {v}{conv !== null ? ` (${conv}%)` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  const periodoLabel = anio
    ? mes ? `${MESES[Number(mes) - 1]} ${anio}` : `Año ${anio}`
    : "Todo el tiempo";

  return (
    <div className="min-h-screen bg-slate-50 pb-8">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 px-8 py-8 mb-8 rounded-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-3xl font-bold text-white mb-1">Reporte comercial</h1>
            <p className="text-blue-300 text-sm">Período: <span className="text-white font-medium">{periodoLabel}</span></p>
          </div>

          {/* ── FILTROS ── */}
          <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-1.5">
            <div>
              <p className="text-blue-300 text-xs mb-1">Año</p>
              <select value={anio} onChange={e => { setAnio(e.target.value); setMes(""); cargar(e.target.value, ""); }}
                className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                <option value="">Todos</option>
                {r.aniosDisponibles.map(a => <option key={a} value={String(a)}>{a}</option>)}
              </select>
            </div>
            <div>
              <p className="text-blue-300 text-xs mb-1">Mes</p>
              <select value={mes} onChange={e => {
                const newMes = e.target.value;
                setMes(newMes);
                // Auto-seleccionar el año más reciente si no hay año elegido
                let efectivoAnio = anio;
                if (newMes && !anio && r.aniosDisponibles.length > 0) {
                  efectivoAnio = String(Math.max(...r.aniosDisponibles));
                  setAnio(efectivoAnio);
                }
                cargar(efectivoAnio, newMes);
              }}
                className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                <option value="">Todos</option>
                {MESES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
              </select>
            </div>
            {(anio || mes) && (
              <button onClick={() => { setAnio(""); setMes(""); cargar("", ""); }}
                className="mt-4 text-blue-300 hover:text-white text-xs underline">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* KPIs hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Clientes",       valor: r.totalEmpresas,       emoji: "🏢", sub: `${r.totalContactos} contactos` },
            { label: "En negociación", valor: r.cantidadActiva,      emoji: "🔄", sub: fmtK(r.valorActivo) + " potencial" },
            { label: "Valor ganado",   valor: fmtK(r.valorGanado),   emoji: "💰", sub: `${r.ganadas} negocios cerrados` },
            { label: "Tasa de cierre", valor: `${r.tasaCierre}%`,    emoji: "🎯", sub: `${r.ganadas} ganadas · ${r.perdidas} perdidas` },
          ].map(k => (
            <div key={k.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{k.emoji}</span>
                <span className="text-xs text-blue-200 font-medium uppercase tracking-wide">{k.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{k.valor}</p>
              <p className="text-xs text-blue-300 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        {/* ── PIPELINE BARRAS ── */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Pipeline por etapa</h2>
            <p className="text-xs text-slate-400 mt-0.5">{r.totalOportunidades} oportunidades · {periodoLabel}</p>
          </div>
          <div className="flex flex-col gap-3 mb-6">
            {ETAPAS.map(etapa => {
              const qty = r.oportunidadesPorEtapa[etapa.key] ?? 0;
              const val = r.valorPorEtapa[etapa.key] ?? 0;
              const pct = Math.round((qty / maxEtapa) * 100);
              return (
                <div key={etapa.key} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <span className="text-xs font-medium text-slate-600">{etapa.label}</span>
                  </div>
                  <div className="flex-1 relative h-7 bg-slate-50 rounded-xl overflow-hidden">
                    <div className="h-full rounded-xl transition-all duration-700"
                      style={{ width: `${Math.max(pct, qty > 0 ? 3 : 0)}%`, backgroundColor: etapa.colorBar, opacity: 0.85 }} />
                    {qty > 0 && (
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-white drop-shadow">{qty}</span>
                    )}
                  </div>
                  <div className="w-28 text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-700">{val > 0 ? fmtK(val) : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Valor del negocio */}
          <div className="pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Valor del negocio</p>
            {[
              { label: "Ganado",   valor: r.valorGanado,  color: "bg-emerald-500", text: "text-emerald-700" },
              { label: "En juego", valor: r.valorActivo,  color: "bg-blue-500",    text: "text-blue-700" },
              { label: "Perdido",  valor: r.valorPerdido, color: "bg-red-400",     text: "text-red-600" },
            ].map(item => {
              const total = r.valorGanado + r.valorActivo + r.valorPerdido;
              const pct = total > 0 ? (item.valor / total) * 100 : 0;
              return (
                <div key={item.label} className="mb-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-500">{item.label}</span>
                    <span className={`text-xs font-bold ${item.text}`}>{fmtK(item.valor)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div className="flex flex-col gap-5">
          {/* Cierre */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Negocios cerrados</h2>
            <div className="flex gap-4 mb-3">
              <div className="flex-1 rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{r.ganadas}</p>
                <p className="text-xs text-emerald-500 mt-0.5">Ganados</p>
                <p className="text-xs text-slate-400">{fmtK(r.valorGanado)}</p>
              </div>
              <div className="flex-1 rounded-xl bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{r.perdidas}</p>
                <p className="text-xs text-red-400 mt-0.5">Perdidos</p>
                <p className="text-xs text-slate-400">{fmtK(r.valorPerdido)}</p>
              </div>
            </div>
            {totalCerradas > 0 && (
              <div className="h-2.5 rounded-full overflow-hidden flex mb-1">
                <div className="bg-emerald-500 transition-all" style={{ width: `${(r.ganadas / totalCerradas) * 100}%` }} />
                <div className="bg-red-400 flex-1" />
              </div>
            )}
            <p className="text-xs text-center font-semibold text-emerald-600 mt-1">{r.tasaCierre}% tasa de cierre</p>
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <Funnel />
          </div>

          {/* Tareas */}
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${r.actividadesPendientes > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            <span className="text-2xl">{r.actividadesPendientes > 0 ? "⏳" : "✅"}</span>
            <div>
              <p className="text-sm font-bold text-slate-800">{r.actividadesPendientes} tarea{r.actividadesPendientes !== 1 ? "s" : ""} pendiente{r.actividadesPendientes !== 1 ? "s" : ""}</p>
              <p className="text-xs text-slate-500">{r.actividadesPendientes === 0 ? "¡Todo al día!" : "Requieren atención"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP CLIENTES ── */}
      {r.topClientes.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Top clientes por valor ganado</h2>
          <div className="flex flex-col gap-2">
            {r.topClientes.map((c, i) => {
              const maxVal = r.topClientes[0].valorGanado || 1;
              const pct = (c.valorGanado / maxVal) * 100;
              return (
                <div key={c.nombre} className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                  <div className="w-48 shrink-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-slate-400">{c.ganadas} ganadas · {c.total} totales</p>
                  </div>
                  <div className="flex-1 relative h-6 bg-slate-50 rounded-xl overflow-hidden">
                    <div className="h-full rounded-xl bg-emerald-500 transition-all" style={{ width: `${Math.max(pct, 3)}%`, opacity: 0.8 }} />
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm font-bold text-emerald-700">{fmtK(c.valorGanado)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PANEL DE FORECASTING ── */}
      {r.cantidadActiva > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pronóstico de ingresos</h2>
              <p className="text-xs text-slate-400 mt-0.5">Valor ponderado por probabilidad de cierre</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-violet-600">{fmtK(r.valorPonderado)}</p>
              <p className="text-xs text-slate-400 mt-0.5">pronóstico esperado</p>
            </div>
          </div>

          {/* Barra comparativa bruto vs ponderado */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Pipeline bruto</span>
              <span className="font-semibold text-slate-700">{fmtK(r.valorActivo)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-3 rounded-full bg-blue-400" style={{ width: "100%" }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Pronóstico ponderado</span>
              <span className="font-semibold text-violet-600">{fmtK(r.valorPonderado)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-3 rounded-full bg-violet-500"
                style={{ width: `${r.valorActivo > 0 ? Math.round((r.valorPonderado / r.valorActivo) * 100) : 0}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Confianza promedio: {r.valorActivo > 0 ? Math.round((r.valorPonderado / r.valorActivo) * 100) : 0}% del pipeline se espera cerrar
            </p>
          </div>

          {/* Desglose por etapa */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Desglose por etapa</p>
            <div className="flex flex-col gap-2">
              {["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"].map(etapaKey => {
                const fe = r.forecastPorEtapa[etapaKey];
                if (!fe) return null;
                const etapa = ETAPAS.find(e => e.key === etapaKey)!;
                const pct = fe.valorBruto > 0 ? Math.round((fe.valorPonderado / fe.valorBruto) * 100) : 0;
                return (
                  <div key={etapaKey} className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                      <p className="text-xs font-medium text-slate-700">{etapa.label}</p>
                      <p className="text-xs text-slate-400">{fe.cantidad} ops · {fe.probPromedio}% prom.</p>
                    </div>
                    <div className="flex-1 relative h-6 bg-slate-50 rounded-xl overflow-hidden">
                      <div className="h-full rounded-xl" style={{ width: `${pct}%`, backgroundColor: etapa.colorBar, opacity: 0.6 }} />
                    </div>
                    <div className="w-28 text-right shrink-0">
                      <p className="text-xs font-bold text-slate-700">{fmtK(fe.valorPonderado)}</p>
                      <p className="text-xs text-slate-400">de {fmtK(fe.valorBruto)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── GRÁFICA MENSUAL ── */}
      <GraficaMensual />

      {/* ── PANEL METAS ── */}
      {editMeta && (
        <div className="mt-4 bg-white rounded-2xl border border-amber-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">🎯 Metas de ventas</h2>
          <div className="flex gap-3 items-end mb-5">
            <div>
              <p className="text-xs text-slate-500 mb-1">Año</p>
              <input type="number" value={metaForm.anio} onChange={e => setMetaForm(f => ({ ...f, anio: Number(e.target.value) }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm w-24 outline-none focus:border-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Mes (vacío = meta anual)</p>
              <select value={metaForm.mes} onChange={e => setMetaForm(f => ({ ...f, mes: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white outline-none focus:border-amber-400">
                <option value="">— Anual —</option>
                {MESES.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Valor objetivo (COP)</p>
              <input type="number" min={0} step={1000000} value={metaForm.valorObjetivo}
                onChange={e => setMetaForm(f => ({ ...f, valorObjetivo: e.target.value }))}
                placeholder="Ej: 50000000"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm w-44 outline-none focus:border-amber-400" />
            </div>
            <button onClick={guardarMeta} disabled={!metaForm.valorObjetivo}
              className="rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
              Guardar meta
            </button>
          </div>
          {metas.length > 0 && (
            <div className="flex flex-col gap-2">
              {metas.map(m => {
                const realAnual = m.mes === null
                  ? Object.values(r?.porMes ?? {}).reduce((acc, mes) => acc + (mes.valorGanado ?? 0), 0)
                  : r?.anioParaMes === m.anio ? (r?.porMes[m.mes!]?.valorGanado ?? 0) : 0;
                const pct = Math.min(100, Math.round((realAnual / Number(m.valorObjetivo)) * 100));
                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-medium text-slate-700">{m.mes ? `${MESES[m.mes - 1]} ${m.anio}` : `Año ${m.anio}`}</p>
                    </div>
                    <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-5 rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-36 text-right text-xs shrink-0">
                      <span className="font-bold text-slate-800">{fmtK(realAnual)}</span>
                      <span className="text-slate-400"> / {fmtK(Number(m.valorObjetivo))}</span>
                    </div>
                    <button onClick={() => eliminarMeta(m.anio, m.mes)}
                      className="text-slate-300 hover:text-red-400 text-sm">×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COMPARATIVA POR AÑO ── */}
      {aniosOrden.length > 1 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Comparativa por año</h2>
            <p className="text-xs text-slate-400 mt-0.5">Todos los años · {aniosOrden.join(", ")}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            <GraficaAnios metrica={v => v.ganadas}     titulo="Negocios ganados"  color="#10b981" />
            <GraficaAnios metrica={v => v.valorGanado} titulo="Valor ganado (COP)" color="#3b82f6" />
            <GraficaAnios metrica={v => v.perdidas}    titulo="Negocios perdidos" color="#f87171" />
            <GraficaAnios metrica={v => v.total}       titulo="Total oportunidades" color="#8b5cf6" />
          </div>

          {/* Leyenda de años con sus colores en la tabla */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumen por año</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-semibold">Año</th>
                    <th className="pb-2 font-semibold text-right">Total ops</th>
                    <th className="pb-2 font-semibold text-right">Ganadas</th>
                    <th className="pb-2 font-semibold text-right">Perdidas</th>
                    <th className="pb-2 font-semibold text-right">Tasa cierre</th>
                    <th className="pb-2 font-semibold text-right">Valor ganado</th>
                    <th className="pb-2 font-semibold text-right">Valor perdido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {aniosOrden.map((a, i) => {
                    const d = r.porAnio[a];
                    const cerr = d.ganadas + d.perdidas;
                    const tasa = cerr > 0 ? Math.round((d.ganadas / cerr) * 100) : 0;
                    const esActivo = anio === String(a);
                    return (
                      <tr key={a} className={`${esActivo ? "bg-blue-50" : "hover:bg-slate-50"} transition-colors`}>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORES_ANIO[i % COLORES_ANIO.length] }} />
                            <span className="font-semibold text-slate-800">{a}</span>
                            {esActivo && <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Filtrado</span>}
                          </div>
                        </td>
                        <td className="py-2.5 text-right text-slate-600">{d.total}</td>
                        <td className="py-2.5 text-right font-medium text-emerald-700">{d.ganadas}</td>
                        <td className="py-2.5 text-right font-medium text-red-500">{d.perdidas}</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-bold ${tasa >= 50 ? "text-emerald-600" : "text-amber-600"}`}>{tasa}%</span>
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-700">{fmtK(d.valorGanado)}</td>
                        <td className="py-2.5 text-right text-red-400">{fmtK(d.valorPerdido)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

