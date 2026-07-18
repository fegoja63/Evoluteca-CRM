"use client";

import { useEffect, useState } from "react";

type Mes = { label: string; ganado: number; tasa: number | null; creadas: number };
type Etapa = { nombre: string; valor: number; cantidad: number };
type Datos = { meses: Mes[]; porEtapa: Etapa[]; valorAbierto: number; trimestre: { ganadoUlt3: number; ganadoPrev3: number } };

const fmtK = (v: number) => {
  const n = Math.abs(v);
  if (n >= 1e9) return `$${(v / 1e9).toFixed(1)}MM`;
  if (n >= 1e6) return `$${Math.round(v / 1e6)}M`;
  if (n >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};
const fmtMoneda = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

// Tres gráficas de tendencia (últimos 12 meses + pipeline por etapa) que
// acompañan al análisis con IA en Reportes. Los datos son deterministas
// (GET /api/ia/tendencias-datos), calculados desde las oportunidades reales.
export function TendenciasGraficas() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/ia/tendencias-datos", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!d) return <div className="mb-6 h-40 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />;

  const deltaTrim = d.trimestre.ganadoPrev3 > 0
    ? Math.round(((d.trimestre.ganadoUlt3 - d.trimestre.ganadoPrev3) / d.trimestre.ganadoPrev3) * 100)
    : null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Tendencias · últimos 12 meses</span>
        <span className="text-[11px] text-slate-400">datos reales</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          titulo="Ganado por mes"
          kpi={fmtK(d.meses.reduce((a, m) => a + m.ganado, 0))}
          delta={deltaTrim}
          deltaLabel="trim. vs. anterior"
        >
          <Barras meses={d.meses} valor={m => m.ganado} formato={fmtK} color="#10b981" />
        </Card>

        <Card
          titulo="Tasa de cierre por mes"
          kpi={ultimaTasa(d.meses)}
        >
          <Linea meses={d.meses} />
        </Card>

        <Card
          titulo="Pipeline abierto por etapa"
          kpi={fmtK(d.valorAbierto)}
          subtitulo="ponderado por probabilidad excluido"
        >
          <EtapasBarras etapas={d.porEtapa} />
        </Card>
      </div>
    </div>
  );
}

function ultimaTasa(meses: Mes[]): string {
  const conDato = meses.filter(m => m.tasa != null);
  return conDato.length ? `${conDato[conDato.length - 1].tasa}%` : "s/d";
}

function Card({ titulo, kpi, delta, deltaLabel, subtitulo, children }: {
  titulo: string; kpi: string; delta?: number | null; deltaLabel?: string; subtitulo?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold text-slate-500">{titulo}</h3>
      <div className="flex items-baseline gap-2 mt-0.5 mb-3">
        <span className="text-xl font-extrabold text-slate-900 tabular-nums">{kpi}</span>
        {delta != null && (
          <span className={`text-xs font-bold ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : ""}{delta}% <span className="font-normal text-slate-400">{deltaLabel}</span>
          </span>
        )}
        {subtitulo && <span className="text-[11px] text-slate-400">{subtitulo}</span>}
      </div>
      {children}
    </div>
  );
}

// Barras verticales (12 meses).
function Barras({ meses, valor, formato, color }: { meses: Mes[]; valor: (m: Mes) => number; formato: (v: number) => string; color: string }) {
  const W = 320, H = 150, base = 118, top = 14;
  const vals = meses.map(valor);
  const max = Math.max(...vals, 1);
  const slot = W / meses.length;
  const barW = Math.min(20, slot * 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      <line x1="0" y1={base} x2={W} y2={base} stroke="#e2e8f0" />
      {meses.map((m, i) => {
        const h = (valor(m) / max) * (base - top);
        const x = i * slot + (slot - barW) / 2;
        const ultimo = i === meses.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={base - h} width={barW} height={Math.max(0, h)} rx={3} fill={color} opacity={ultimo ? 1 : 0.55} />
            {ultimo && valor(m) > 0 && (
              <text x={x + barW / 2} y={base - h - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#475569">{formato(valor(m))}</text>
            )}
            {i % 2 === 0 && <text x={i * slot + slot / 2} y={H - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{m.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// Línea de tasa de cierre (%), meses sin datos se saltan.
function Linea({ meses }: { meses: Mes[] }) {
  const W = 320, H = 150, base = 118, top = 14;
  const slot = W / meses.length;
  const pts = meses
    .map((m, i) => (m.tasa == null ? null : { x: i * slot + slot / 2, y: base - (m.tasa / 100) * (base - top), tasa: m.tasa }))
    .filter((p): p is { x: number; y: number; tasa: number } => p != null);
  const linea = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = pts.length ? `${pts[0].x},${base} ${linea} ${pts[pts.length - 1].x},${base}` : "";
  const fin = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      <line x1="0" y1={base} x2={W} y2={base} stroke="#e2e8f0" />
      {pts.length >= 2 && <polygon points={area} fill="#23708f" opacity={0.12} />}
      {pts.length >= 2 && <polyline points={linea} fill="none" stroke="#23708f" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {fin && <circle cx={fin.x} cy={fin.y} r={4} fill="#23708f" />}
      {fin && <text x={fin.x} y={fin.y - 8} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1c5972">{fin.tasa}%</text>}
      {meses.map((m, i) => i % 2 === 0 && (
        <text key={i} x={i * slot + slot / 2} y={H - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{m.label}</text>
      ))}
      {pts.length < 2 && <text x={W / 2} y={base / 2} textAnchor="middle" fontSize="10" fill="#94a3b8">Sin cierres suficientes</text>}
    </svg>
  );
}

// Barras horizontales por etapa.
function EtapasBarras({ etapas }: { etapas: Etapa[] }) {
  if (!etapas.length) return <p className="text-xs text-slate-400 py-6 text-center">Sin oportunidades abiertas</p>;
  const max = Math.max(...etapas.map(e => e.valor), 1);
  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {etapas.map((e, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-20 shrink-0 truncate text-[11px] text-slate-600" title={e.nombre}>{e.nombre}</span>
          <div className="flex-1 h-5 rounded-md bg-slate-100 overflow-hidden">
            <div className="h-full rounded-md bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${Math.max(3, Math.round((e.valor / max) * 100))}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-slate-700 tabular-nums" title={fmtMoneda(e.valor)}>{fmtK(e.valor)}</span>
        </div>
      ))}
    </div>
  );
}
