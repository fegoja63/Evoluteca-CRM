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

export default function RendimientoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const rol = session?.user?.rol;
  const puedeVer = rol === "ADMINISTRADOR" || rol === "GERENTE";

  useEffect(() => {
    if (status === "loading") return;
    if (!puedeVer) { router.push("/dashboard"); return; }
    fetch("/api/reportes/vendedores")
      .then(r => r.json())
      .then(data => { setVendedores(data); setCargando(false); });
  }, [status, puedeVer]);

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
            <h2 className="text-sm font-bold text-slate-900 mb-4">Ranking — Valor ganado total</h2>
            <div className="flex flex-col gap-3">
              {vendedores.map((v, i) => {
                const pct = Math.round((v.valorGanado / maxValor) * 100);
                const isSelected = seleccionado === v.id;
                return (
                  <button key={v.id} onClick={() => setSeleccionado(isSelected ? null : v.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${isSelected ? "border-blue-300 bg-blue-50" : "border-slate-100 hover:border-slate-200 bg-white"}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{i+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">{v.nombre}</span>
                          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ROL_COLOR[v.rol]}`}>
                            {ROL_LABEL[v.rol]}
                          </span>
                          {v.actsVencidas > 0 && (
                            <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-600">
                              {v.actsVencidas} vencidas
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-emerald-700">{fmt(v.valorGanado)}</p>
                        <p className="text-xs text-slate-400">{v.ganadas} ganadas · {v.tasaCierre}% cierre</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-8">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.max(pct, v.valorGanado > 0 ? 2 : 0)}%` }} />
                      </div>
                    </div>
                  </button>
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
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${ROL_COLOR[detalle.rol]}`}>
                    {ROL_LABEL[detalle.rol]}
                  </span>
                </div>
                <button onClick={() => setSeleccionado(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Valor ganado total", valor: fmt(detalle.valorGanado), color: "text-emerald-700", sub: `${detalle.ganadas} negocios` },
                  { label: "Ganado este mes",    valor: fmt(detalle.valorMes),    color: "text-blue-700",    sub: `${detalle.ganadasMes} cierres` },
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pipeline */}
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

                {/* Actividades */}
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
                    <th className="px-4 py-3 text-right font-semibold">Ops activas</th>
                    <th className="px-4 py-3 text-right font-semibold">Ganadas</th>
                    <th className="px-4 py-3 text-right font-semibold">Tasa cierre</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor ganado</th>
                    <th className="px-4 py-3 text-right font-semibold">Pipeline</th>
                    <th className="px-4 py-3 text-right font-semibold">Vencidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vendedores.map(v => (
                    <tr key={v.id}
                      onClick={() => setSeleccionado(seleccionado === v.id ? null : v.id)}
                      className={`cursor-pointer transition-colors ${seleccionado === v.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{v.nombre}</span>
                        <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${ROL_COLOR[v.rol]}`}>{ROL_LABEL[v.rol]}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{v.activas}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">{v.ganadas}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${v.tasaCierre >= 30 ? "text-emerald-600" : "text-amber-600"}`}>{v.tasaCierre}%</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(v.valorGanado)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(v.valorPipeline)}</td>
                      <td className="px-4 py-3 text-right">
                        {v.actsVencidas > 0
                          ? <span className="font-bold text-red-600">{v.actsVencidas}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
