"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Vendedor = {
  id: string;
  nombre: string;
  rol: string;
  totalOps: number;
  activas: number;
  ganadas: number;
  perdidas: number;
  tasaCierre: number;
  valorGanado: number;
  valorPipeline: number;
  valorPonderado: number;
  valorMes: number;
  ganadasMes: number;
  actsPendientes: number;
  actsVencidas: number;
  actsCompletadas: number;
  metaMes: number;
  porEtapa?: Record<string, number>;
};

const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Admin",
  GERENTE: "Gerente",
  COMERCIAL: "Comercial",
};

const ROL_COLOR: Record<string, string> = {
  ADMINISTRADOR: "bg-violet-100 text-violet-700",
  GERENTE: "bg-blue-100 text-blue-700",
  COMERCIAL: "bg-slate-100 text-slate-600",
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function RendimientoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [editandoMeta, setEditandoMeta] = useState<string | null>(null);
  const [valorMeta, setValorMeta] = useState("");
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual  = hoy.getMonth() + 1;

  const rol = session?.user?.rol;
  const esAdmin = rol === "ADMINISTRADOR";
  const puedeVer = esAdmin || rol === "GERENTE";

  useEffect(() => {
    if (status === "loading") return;
    if (!puedeVer) { router.push("/dashboard"); return; }
    cargarVendedores();
  }, [status, puedeVer]);

  function cargarVendedores() {
    fetch("/api/reportes/vendedores")
      .then(r => r.json())
      .then(data => { setVendedores(data); setCargando(false); });
  }

  async function guardarMeta(userId: string) {
    const meta = parseFloat(valorMeta.replace(/\./g, "").replace(",", "."));
    if (isNaN(meta) || meta < 0) return;
    setGuardandoMeta(true);
    await fetch("/api/metas-vendedor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, anio: anioActual, mes: mesActual, meta }),
    });
    setGuardandoMeta(false);
    setEditandoMeta(null);
    setValorMeta("");
    cargarVendedores();
  }

  function fmt(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  const maxValor = Math.max(...vendedores.map(v => v.valorGanado), 1);
  const detalle  = vendedores.find(v => v.id === seleccionado) ?? null;

  if (!puedeVer && status !== "loading") return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/equipo" className="text-xs text-slate-400 hover:text-blue-600">← Equipo</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Rendimiento por vendedor</h1>
        <span className="text-xs text-slate-400 ml-1">{MESES[mesActual - 1]} {anioActual}</span>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex gap-1">{[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
          ))}</div>
        </div>
      ) : vendedores.length === 0 ? (
        <p className="text-sm text-slate-400">No hay vendedores con registros.</p>
      ) : (
        <div className="space-y-6">

          {/* ── RANKING VISUAL ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Ranking — Ganado este mes vs. meta</h2>
              <span className="text-xs text-slate-400">{MESES[mesActual - 1]} {anioActual}</span>
            </div>
            <div className="flex flex-col gap-3">
              {vendedores.map((v, i) => {
                const pctGanado = v.valorGanado > 0 ? Math.round((v.valorGanado / maxValor) * 100) : 0;
                const pctMeta   = v.metaMes > 0 ? Math.min(Math.round((v.valorMes / v.metaMes) * 100), 100) : null;
                const isSelected = seleccionado === v.id;
                const editando   = editandoMeta === v.id;

                return (
                  <div key={v.id} className={`rounded-xl border p-3 transition-all ${isSelected ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-white"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{i+1}</span>
                      <button className="flex-1 min-w-0 text-left" onClick={() => setSeleccionado(isSelected ? null : v.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{v.nombre}</span>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ROL_COLOR[v.rol]}`}>{ROL_LABEL[v.rol]}</span>
                          {v.actsVencidas > 0 && (
                            <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-600">{v.actsVencidas} vencidas</span>
                          )}
                        </div>
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-700">{fmt(v.valorMes)} <span className="text-slate-300 font-normal text-xs">este mes</span></p>
                        {v.metaMes > 0
                          ? <p className="text-xs text-slate-400">Meta: {fmt(v.metaMes)} · <span className={pctMeta !== null && pctMeta >= 100 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{pctMeta}%</span></p>
                          : esAdmin
                            ? <button onClick={() => { setEditandoMeta(v.id); setValorMeta(""); }} className="text-xs text-blue-500 hover:text-blue-700">+ fijar meta</button>
                            : <p className="text-xs text-slate-300">Sin meta</p>
                        }
                      </div>
                      {esAdmin && v.metaMes > 0 && !editando && (
                        <button onClick={() => { setEditandoMeta(v.id); setValorMeta(String(v.metaMes)); }} className="text-slate-300 hover:text-blue-500 text-sm ml-1" title="Editar meta">✏️</button>
                      )}
                    </div>

                    {/* Barra ganado total */}
                    <div className="flex items-center gap-2 pl-8 mb-1">
                      <span className="text-xs text-slate-400 w-20 shrink-0">Total ganado</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.max(pctGanado, v.valorGanado > 0 ? 2 : 0)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right">{fmt(v.valorGanado)}</span>
                    </div>

                    {/* Barra meta mensual */}
                    {v.metaMes > 0 && (
                      <div className="flex items-center gap-2 pl-8">
                        <span className="text-xs text-slate-400 w-20 shrink-0">Meta mes</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${(pctMeta ?? 0) >= 100 ? "bg-emerald-500" : (pctMeta ?? 0) >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                            style={{ width: `${pctMeta ?? 0}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold w-16 text-right ${(pctMeta ?? 0) >= 100 ? "text-emerald-600" : (pctMeta ?? 0) >= 60 ? "text-blue-600" : "text-amber-600"}`}>{pctMeta}%</span>
                      </div>
                    )}

                    {/* Input editar meta */}
                    {editando && (
                      <div className="flex items-center gap-2 pl-8 mt-2">
                        <span className="text-xs text-slate-500">Meta {MESES[mesActual-1]}:</span>
                        <input
                          type="number"
                          value={valorMeta}
                          onChange={e => setValorMeta(e.target.value)}
                          placeholder="ej: 5000000"
                          className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                          onKeyDown={e => e.key === "Enter" && guardarMeta(v.id)}
                          autoFocus
                        />
                        <button
                          onClick={() => guardarMeta(v.id)}
                          disabled={guardandoMeta}
                          className="rounded-lg bg-blue-600 text-white text-xs px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
                        >
                          {guardandoMeta ? "..." : "Guardar"}
                        </button>
                        <button onClick={() => setEditandoMeta(null)} className="text-slate-400 hover:text-slate-600 text-xs">Cancelar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── DETALLE DEL VENDEDOR SELECCIONADO ── */}
          {detalle && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{detalle.nombre}</h2>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ROL_COLOR[detalle.rol]}`}>{ROL_LABEL[detalle.rol]}</span>
                </div>
                <button onClick={() => setSeleccionado(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Valor ganado total", valor: fmt(detalle.valorGanado), color: "text-emerald-700", sub: `${detalle.ganadas} negocios` },
                  { label: "Ganado este mes",    valor: fmt(detalle.valorMes),    color: "text-blue-700",    sub: detalle.metaMes > 0 ? `Meta: ${fmt(detalle.metaMes)}` : `${detalle.ganadasMes} cierres` },
                  { label: "Pipeline activo",    valor: fmt(detalle.valorPipeline), color: "text-slate-800", sub: `${detalle.activas} oportunidades` },
                  { label: "Pronóstico",         valor: fmt(detalle.valorPonderado), color: "text-violet-700", sub: "valor ponderado" },
                ].map(k => (
                  <div key={k.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400 mb-1">{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.valor}</p>
                    <p className="text-xs text-slate-400">{k.sub}</p>
                  </div>
                ))}
              </div>

              {detalle.metaMes > 0 && (
                <div className="rounded-xl bg-slate-50 p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600">Avance meta {MESES[mesActual-1]}</p>
                    <p className="text-xs font-bold text-slate-700">{fmt(detalle.valorMes)} / {fmt(detalle.metaMes)}</p>
                  </div>
                  <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                    {(() => {
                      const pct = Math.min(Math.round((detalle.valorMes / detalle.metaMes) * 100), 100);
                      return (
                        <div
                          className={`h-3 rounded-full transition-all duration-700 ${pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {Math.min(Math.round((detalle.valorMes / detalle.metaMes) * 100), 100)}% completado
                    {detalle.valorMes < detalle.metaMes && ` · faltan ${fmt(detalle.metaMes - detalle.valorMes)}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pipeline</p>
                  {[
                    { label: "Total oportunidades", valor: detalle.totalOps,  color: "text-slate-700" },
                    { label: "En negociación",       valor: detalle.activas,   color: "text-blue-700" },
                    { label: "Ganadas",              valor: detalle.ganadas,   color: "text-emerald-700" },
                    { label: "Perdidas",             valor: detalle.perdidas,  color: "text-red-500" },
                    { label: "Tasa de cierre",       valor: `${detalle.tasaCierre}%`, color: detalle.tasaCierre >= 30 ? "text-emerald-700" : "text-amber-600" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className={`text-xs font-bold ${r.color}`}>{r.valor}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actividades</p>
                  {[
                    { label: "Pendientes",   valor: detalle.actsPendientes,  color: "text-blue-700" },
                    { label: "Vencidas",     valor: detalle.actsVencidas,    color: detalle.actsVencidas > 0 ? "text-red-600" : "text-slate-700" },
                    { label: "Completadas",  valor: detalle.actsCompletadas, color: "text-emerald-700" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className={`text-xs font-bold ${r.color}`}>{r.valor}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embudo por etapa */}
              {detalle.porEtapa && (
                <div className="mt-4 rounded-xl border border-slate-100 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Embudo de conversión</p>
                  {[
                    { etapa: "PROSPECTO",   label: "Prospecto",   color: "bg-slate-300" },
                    { etapa: "CALIFICADO",  label: "Calificado",  color: "bg-blue-400" },
                    { etapa: "PROPUESTA",   label: "Cotización",  color: "bg-violet-400" },
                    { etapa: "NEGOCIACION", label: "Negociación", color: "bg-amber-400" },
                    { etapa: "GANADA",      label: "Ganada",      color: "bg-emerald-500" },
                    { etapa: "PERDIDA",     label: "Perdida",     color: "bg-red-400" },
                  ].map(({ etapa, label, color }) => {
                    const n = detalle.porEtapa?.[etapa] ?? 0;
                    const max = Math.max(...Object.values(detalle.porEtapa ?? {}), 1);
                    return (
                      <div key={etapa} className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${n > 0 ? Math.max((n / max) * 100, 4) : 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-6 text-right">{n}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TABLA COMPARATIVA ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Tabla comparativa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                    <th className="px-4 py-3 text-right font-semibold">Ganado mes</th>
                    <th className="px-4 py-3 text-right font-semibold">Meta mes</th>
                    <th className="px-4 py-3 text-right font-semibold">Avance</th>
                    <th className="px-4 py-3 text-right font-semibold">Tasa cierre</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor ganado</th>
                    <th className="px-4 py-3 text-right font-semibold">Vencidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vendedores.map(v => {
                    const pctMeta = v.metaMes > 0 ? Math.min(Math.round((v.valorMes / v.metaMes) * 100), 100) : null;
                    return (
                      <tr key={v.id}
                        onClick={() => setSeleccionado(seleccionado === v.id ? null : v.id)}
                        className={`cursor-pointer transition-colors ${seleccionado === v.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">{v.nombre}</span>
                          <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${ROL_COLOR[v.rol]}`}>{ROL_LABEL[v.rol]}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-blue-700">{fmt(v.valorMes)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{v.metaMes > 0 ? fmt(v.metaMes) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-right">
                          {pctMeta !== null
                            ? <span className={`font-bold text-xs ${pctMeta >= 100 ? "text-emerald-600" : pctMeta >= 60 ? "text-blue-600" : "text-amber-600"}`}>{pctMeta}%</span>
                            : <span className="text-slate-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${v.tasaCierre >= 30 ? "text-emerald-600" : "text-amber-600"}`}>{v.tasaCierre}%</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(v.valorGanado)}</td>
                        <td className="px-4 py-3 text-right">
                          {v.actsVencidas > 0
                            ? <span className="font-bold text-red-600">{v.actsVencidas}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
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
