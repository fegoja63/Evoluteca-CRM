"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  IconBuilding,
  IconRefresh,
  IconCurrencyDollar,
  IconTargetArrow,
  IconTarget,
  IconClock,
  IconCircleCheck,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import { MoneyInput } from "@/components/money-input";
import { AnalisisTendenciasIA } from "@/components/analisis-tendencias-ia";
import { TendenciasGraficas } from "@/components/tendencias-graficas";

type ResAnio = { ganadas: number; perdidas: number; activas: number; valorGanado: number; valorPerdido: number; valorActivo: number; total: number };
type ResMes  = { ganadas: number; perdidas: number; valorGanado: number; total: number };
type Meta    = { id: string; anio: number; mes: number | null; valorObjetivo: string; calculada?: boolean; mesesConfigurados?: number };

type TopCliente = { nombre: string; valorGanado: number; ganadas: number; total: number };
type MotivoPerdida = { motivo: string; cantidad: number; valorTotal: number };

type ForecastEtapa = { cantidad: number; valorBruto: number; valorPonderado: number; probPromedio: number };

type ComparativaMes = {
  mesActual: number; anioActual: number; valorActual: number;
  mesAnterior: number; anioAnterior: number; valorAnterior: number;
  deltaPct: number | null;
};

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
  diasPromedioCierre: number | null;
  oportunidadesPorEtapa: Record<string, number>;
  valorPorEtapa: Record<string, number>;
  actividadesPendientes: number;
  aniosDisponibles: number[];
  segmentosDisponibles: string[];
  sedesDisponibles: string[];
  porAnio: Record<number, ResAnio>;
  porMes: Record<number, ResMes>;
  anioParaMes: number;
  comparativaMes: ComparativaMes;
  topClientes: TopCliente[];
  motivosPerdida: MotivoPerdida[];
  valorPonderado: number;
  forecastPorEtapa: Record<string, ForecastEtapa>;
  filtro: { anio: number | null; mes: number | null; vendedor: string | null; segmento: string | null; sede: string | null };
};

type Vendedor = { id: string; nombre: string };

// El nombre visible de cada etapa es configurable por tenant (Configuración →
// Etapas del pipeline); el "key" y el color de la barra quedan fijos en código.
const ETAPA_COLOR_BAR: Record<string, string> = {
  PROSPECTO:   "#94a3b8",
  CALIFICADO:  "#60a5fa",
  PROPUESTA:   "#8b5cf6",
  NEGOCIACION: "#fbbf24",
  GANADA:      "#10b981",
  PERDIDA:     "#f87171",
};

const ETAPAS_DEFECTO = [
  { key: "PROSPECTO",   label: "Prospecto" },
  { key: "CALIFICADO",  label: "Calificado" },
  { key: "PROPUESTA",   label: "Cotización" },
  { key: "NEGOCIACION", label: "Negociación" },
  { key: "GANADA",      label: "Ganada" },
  { key: "PERDIDA",     label: "Perdida" },
];

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const COLORES_ANIO = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

export default function ReportesPage() {
  const { data: session } = useSession();
  const esAdmin = session?.user?.rol === "ADMINISTRADOR";
  const [r, setR] = useState<Reporte | null>(null);
  const [ETAPAS, setETAPAS] = useState(ETAPAS_DEFECTO.map(e => ({ ...e, colorBar: ETAPA_COLOR_BAR[e.key] })));
  const [anio, setAnio] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [vendedor, setVendedor] = useState<string>("");
  const [segmento, setSegmento] = useState<string>("");
  const [sede, setSede] = useState<string>("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [editMeta, setEditMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ anio: new Date().getFullYear(), mes: "", valorObjetivo: "" });

  function cargar(a = anio, m = mes, v = vendedor, seg = segmento, sd = sede) {
    const params = new URLSearchParams();
    if (a) params.set("anio", a);
    if (m) params.set("mes", m);
    if (v) params.set("vendedor", v);
    if (seg) params.set("segmento", seg);
    if (sd) params.set("sede", sd);
    fetch(`/api/reportes?${params}`).then(res => res.json()).then(setR);
  }

  function cargarVendedores() {
    fetch("/api/usuarios").then(res => res.json()).then(usuarios => {
      setVendedores(Array.isArray(usuarios) ? usuarios.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })) : []);
    });
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

  useEffect(() => {
    fetch("/api/etapas-pipeline").then(r => r.json()).then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      setETAPAS(
        data
          .filter((e: { oculta?: boolean }) => !e.oculta)
          .map((e: { key: string; nombre: string }) => ({ key: e.key, label: e.nombre, colorBar: ETAPA_COLOR_BAR[e.key] }))
      );
    });
  }, []);
  useEffect(() => { if (session?.user?.rol && session.user.rol !== "COMERCIAL") cargarVendedores(); }, [session?.user?.rol]);

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
        <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );

  const maxEtapa   = Math.max(...ETAPAS.map(e => r.oportunidadesPorEtapa[e.key] ?? 0), 1);
  const totalCerradas = r.ganadas + r.perdidas;
  const aniosOrden = [...r.aniosDisponibles].sort();

  // ── Gráfica comparativa por año ──
  function GraficaAnios({ metrica, titulo, color, subirEsBueno = true }: { metrica: (v: ResAnio) => number; titulo: string; color: string; subirEsBueno?: boolean }) {
    const datos = r!.porAnio;
    const valores = aniosOrden.map(a => metrica(datos[a] ?? { ganadas:0,perdidas:0,activas:0,valorGanado:0,valorPerdido:0,valorActivo:0,total:0 }));
    const maxVal = Math.max(...valores, 1);
    const W = 400, H = 140, barW = Math.min(40, (W - 40) / aniosOrden.length - 8), pad = 30;
    const slot = (W - pad) / aniosOrden.length;
    const anioActual = new Date().getFullYear();

    // Variación vs. el año anterior (los dos últimos años con datos)
    const ultimo = valores[valores.length - 1];
    const penultimo = valores.length > 1 ? valores[valores.length - 2] : null;
    const delta = penultimo && penultimo > 0 ? Math.round(((ultimo - penultimo) / penultimo) * 100) : null;
    const deltaEsBueno = delta !== null ? (delta >= 0) === subirEsBueno : null;

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{titulo}</p>
          {delta !== null && (
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${deltaEsBueno ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
          )}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {valores.map((v, i) => {
            const esParcial = Number(aniosOrden[i]) === anioActual;
            const barH = Math.max(2, (v / maxVal) * (H - 40));
            const x = pad + i * slot + (slot - barW) / 2;
            const y = H - 28 - barH;
            return (
              <g key={aniosOrden[i]}>
                <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color}
                  opacity={anio === String(aniosOrden[i]) ? 1 : 0.55}
                  strokeDasharray={esParcial ? "4,3" : undefined}
                  stroke={esParcial ? color : "none"} strokeWidth={esParcial ? 1.5 : 0}
                  fillOpacity={esParcial ? 0.35 : undefined} />
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#334155">
                  {v > 999 ? fmtK(v) : v}
                </text>
                <text x={x + barW / 2} y={H - 10} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {aniosOrden[i]}{esParcial ? " *" : ""}
                </text>
              </g>
            );
          })}
          <line x1={pad} y1={H - 28} x2={W} y2={H - 28} stroke="#e2e8f0" strokeWidth={1} />
        </svg>
        {aniosOrden.some(a => Number(a) === anioActual) && (
          <p className="text-[10px] text-slate-400 mt-1">* {anioActual} en curso — año incompleto, no comparable 1:1 con años cerrados</p>
        )}
      </div>
    );
  }

  // ── Cumplimiento de meta anual (valor ganado vs meta configurada, por año) ──
  // Barras pareadas (Ganado / Meta) en vez de barra + línea: con años donde la meta
  // es mucho más alta que lo ganado, la línea+etiqueta flotante se salía del gráfico.
  function GraficaMetaAnual() {
    if (!r) return null;
    const valores = aniosOrden.map(a => r!.porAnio[a]?.valorGanado ?? 0);
    const metaAnual = (a: number) => metas.find(m => m.anio === a && m.mes === null);
    const metaVals = aniosOrden.map(a => { const m = metaAnual(a); return m ? Number(m.valorObjetivo) : null; });
    const hayMetas = metaVals.some(v => v !== null);
    const maxVal = Math.max(...valores, ...metaVals.filter((v): v is number => v !== null), 1);
    const W = 580, H = 150, pad = 24, topPad = 26, baseY = H - 30;
    const drawH = baseY - topPad;
    const slot = (W - pad) / aniosOrden.length;
    const barW = Math.min(22, (slot - 20) / 2);
    const gap = 3;
    const groupW = barW * 2 + gap;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Cumplimiento de meta anual</p>
            <p className="text-xs text-slate-400 mt-0.5">Valor ganado vs. meta configurada por año</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Ganado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-400 inline-block" /> Meta anual</span>
          </div>
        </div>
        {!hayMetas ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Configura una meta anual (deja el mes en blanco) desde &quot;Configurar metas&quot; arriba para ver el cumplimiento por año.
          </p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {aniosOrden.map((a, i) => {
              const v = valores[i];
              const metaV = metaVals[i];
              const barHGanado = Math.max(v > 0 ? 4 : 0, (v / maxVal) * drawH);
              const barHMeta = metaV !== null ? Math.max(4, (metaV / maxVal) * drawH) : 0;
              const xGroup = pad + i * slot + (slot - groupW) / 2;
              const xMeta = xGroup + barW + gap;
              const yGanado = baseY - barHGanado;
              const yMeta = baseY - barHMeta;
              const pct = metaV ? Math.round((v / metaV) * 100) : null;
              const topOfGroup = Math.min(yGanado, metaV !== null ? yMeta : yGanado);
              const pctY = Math.max(8, topOfGroup - 16);
              return (
                <g key={a}>
                  <rect x={xGroup} y={yGanado} width={barW} height={barHGanado} rx={3} fill="#10b981" opacity={0.9} />
                  {metaV !== null && (
                    <rect x={xMeta} y={yMeta} width={barW} height={barHMeta} rx={3} fill="#94a3b8" opacity={0.9} />
                  )}
                  {pct !== null && (
                    <text x={xGroup + groupW / 2} y={pctY} textAnchor="middle" fontSize={9} fontWeight="700"
                      fill={pct >= 100 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626"}>
                      {pct}%
                    </text>
                  )}
                  {v > 0 && (
                    <text x={xGroup + barW / 2} y={yGanado - 4} textAnchor="middle" fontSize={7} fill="#059669" fontWeight="700">
                      {fmtK(v)}
                    </text>
                  )}
                  {metaV !== null && (
                    <text x={xMeta + barW / 2} y={yMeta - 4} textAnchor="middle" fontSize={7} fill="#64748b" fontWeight="600">
                      {fmtK(metaV)}
                    </text>
                  )}
                  <text x={xGroup + groupW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{a}</text>
                </g>
              );
            })}
            <line x1={pad} y1={baseY} x2={W} y2={baseY} stroke="#e2e8f0" strokeWidth={1} />
          </svg>
        )}
      </div>
    );
  }

  // ── Gráfica mensual (siempre visible, año más reciente por defecto) ──
  function GraficaMensual() {
    if (!r) return null;
    const vals    = MESES.map((_, i) => r!.porMes[i + 1]?.valorGanado ?? 0);
    const perdidos = MESES.map((_, i) => r!.porMes[i + 1]?.perdidas   ?? 0);
    const ganados  = MESES.map((_, i) => r!.porMes[i + 1]?.ganadas    ?? 0);
    // Meta mensual para el año del gráfico — solo se compara cada mes contra SU
    // propia meta mensual, nunca contra la meta anual (compararía un mes contra
    // el objetivo del año completo, mostrando siempre porcentajes cercanos a 0%).
    const metaMes = (i: number) => metas.find(m => m.anio === r!.anioParaMes && m.mes === i + 1);
    const metasDelAnio = MESES.map((_, i) => metaMes(i)).filter((m): m is Meta => !!m);
    const maxVal  = Math.max(...vals, ...metasDelAnio.map(m => Number(m.valorObjetivo)), 1);
    const W = 580, H = 150, barW = 26, pad = 24;
    const slot = (W - pad) / 12;
    const hayDatos = vals.some(v => v > 0);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Actividad mensual — {r!.anioParaMes}</p>
            <p className="text-xs text-slate-400 mt-0.5">Valor ganado · negocios cerrados por mes</p>
            {r!.comparativaMes.deltaPct !== null && (
              <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 mt-1.5 ${r!.comparativaMes.deltaPct >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {r!.comparativaMes.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(r!.comparativaMes.deltaPct)}% vs {MESES[r!.comparativaMes.mesAnterior - 1]}{r!.comparativaMes.anioAnterior !== r!.comparativaMes.anioActual ? ` ${r!.comparativaMes.anioAnterior}` : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Ganado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300 inline-block" /> Perdidos</span>
            <span className="flex items-center gap-1"><span className="w-8 border-t-2 border-dashed border-amber-400 inline-block" /> Meta</span>
            {esAdmin && (
              <button onClick={() => setEditMeta(v => !v)}
                className="ml-2 flex items-center gap-1 text-xs text-amber-600 border border-amber-200 rounded-lg px-2 py-0.5 hover:bg-amber-50">
                {editMeta ? <><IconX size={13} stroke={1.75} /> Cerrar metas</> : <><IconTarget size={13} stroke={1.75} /> Configurar metas</>}
              </button>
            )}
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
              const metaV = metaI ? Number(metaI.valorObjetivo) : null;
              const metaY = metaV ? H - 30 - Math.max(4, (metaV / maxVal) * (H - 45)) : null;
              const pct = metaV ? Math.round((v / metaV) * 100) : null;
              const pctY = Math.min(y, metaY ?? y) - (v > 0 ? 12 : 4);
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
                  {pct !== null && (
                    <text x={x + barW / 2} y={pctY} textAnchor="middle" fontSize={7} fontWeight="700"
                      fill={pct >= 100 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626"}>
                      {pct}%
                    </text>
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

  // ── Donut de motivos de pérdida ──
  // Paleta amplia con saltos fuertes de tono y luminosidad entre colores
  // consecutivos, para que cada motivo se distinga a simple vista incluso
  // en segmentos delgados del donut. Evita los colores que ya tienen un
  // significado fijo en esta misma página (azul = Calificado, morado =
  // Propuesta, verde = Ganada, ámbar claro = Negociación).
  const COLORES_MOTIVOS = [
    "#dc2626", "#f97316", "#db2777", "#78350f", "#64748b",
    "#b91c1c", "#c2410c", "#9d174d", "#a8a29e", "#7c2d12",
  ];
  const DONUT_GAP = 2.5; // separación visual entre segmentos, en unidades de circunferencia

  // Redondea cada valor a un % entero repartiendo el remanente por "mayor resto"
  // (método Hare/largest remainder) — así los % mostrados siempre suman 100,
  // en vez de quedar en 98% o 101% por redondear cada uno por separado.
  function porcentajesEnteros(valores: number[]): number[] {
    const total = valores.reduce((a, b) => a + b, 0);
    if (total === 0) return valores.map(() => 0);
    const exactos = valores.map(v => (v / total) * 100);
    const enteros = exactos.map(Math.floor);
    let faltante = 100 - enteros.reduce((a, b) => a + b, 0);
    const ordenPorResto = exactos
      .map((v, i) => ({ i, resto: v - Math.floor(v) }))
      .sort((a, b) => b.resto - a.resto);
    for (let k = 0; k < faltante; k++) enteros[ordenPorResto[k].i]++;
    return enteros;
  }

  function MotivosPerdidaDonut() {
    const ordenados = [...r!.motivosPerdida].sort((a, b) => b.cantidad - a.cantidad);
    const total = ordenados.reduce((acc, m) => acc + m.cantidad, 0);
    if (total === 0) return null;
    const porcentajes = porcentajesEnteros(ordenados.map(m => m.cantidad));

    const colorPorMotivo = new Map<string, string>(ordenados.map((m, i) => [m.motivo, COLORES_MOTIVOS[i % COLORES_MOTIVOS.length]]));

    const r_ = 42, C = 2 * Math.PI * r_;
    let acumulado = 0;

    return (
      <div className="flex flex-col xl:flex-row items-center gap-8">
        <div className="relative w-52 h-52 shrink-0">
          <svg viewBox="0 0 100 100" className="w-52 h-52 -rotate-90" style={{ filter: "drop-shadow(0 4px 10px rgba(220,38,38,0.18))" }}>
            <circle cx="50" cy="50" r={r_} fill="none" stroke="#f1f5f9" strokeWidth="18" />
            {ordenados.map(m => {
              const pct = m.cantidad / total;
              const dashFull = pct * C;
              const dash = Math.max(0, dashFull - DONUT_GAP);
              const dashoffset = -acumulado;
              acumulado += dashFull;
              return (
                <circle key={m.motivo} cx="50" cy="50" r={r_} fill="none" stroke={colorPorMotivo.get(m.motivo)} strokeWidth="18"
                  strokeLinecap="round" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={dashoffset} />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-slate-800">{total}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">perdidos</span>
          </div>
        </div>
        <div className="flex-1 w-full min-w-0 flex flex-col gap-2">
          <p className="text-xs text-slate-400 -mt-1">% sobre el total de negocios perdidos</p>
          {ordenados.map((m, i) => (
            <div key={m.motivo} className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorPorMotivo.get(m.motivo) }} />
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{m.motivo}</span>
              <span className="text-sm font-bold text-red-600 w-10 text-right shrink-0">{porcentajes[i]}%</span>
              <span className="text-xs text-slate-400 w-14 text-right shrink-0">{m.cantidad} neg.</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Valor perdido por motivo (complementa el donut: cuánto dinero, no solo cuántos negocios) ──
  // Cada gráfica se ordena por su propia métrica (el donut por cantidad de
  // negocios, esta por valor perdido, de mayor a menor) — el color de cada
  // motivo es el mismo en ambas (asignado por cantidad), así que se
  // identifica por color y nombre aunque la fila no coincida.
  function ValorPerdidoPorMotivo() {
    const colorPorMotivo = new Map<string, string>(
      [...r!.motivosPerdida].sort((a, b) => b.cantidad - a.cantidad).map((m, i) => [m.motivo, COLORES_MOTIVOS[i % COLORES_MOTIVOS.length]])
    );
    const ordenados = [...r!.motivosPerdida].filter(m => m.valorTotal > 0).sort((a, b) => b.valorTotal - a.valorTotal);
    if (ordenados.length === 0) return null;
    const maxVal = ordenados[0].valorTotal || 1;
    // % del valor total perdido (no del máximo de la barra) — para que se
    // pueda comparar directamente contra el % del donut de arriba, que es
    // por cantidad de negocios. El ancho de la barra sigue siendo relativo
    // al máximo, solo para que la más grande use el 100% del ancho visual.
    const porcentajesValor = porcentajesEnteros(ordenados.map(m => m.valorTotal));

    return (
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor perdido por motivo</p>
        <p className="text-xs text-slate-400 mb-3">% sobre el total de dinero perdido — compáralo con el % de negocios de arriba</p>
        <div className="flex flex-col gap-2">
          {ordenados.map((m, i) => {
            const anchoBarra = (m.valorTotal / maxVal) * 100;
            return (
              <div key={m.motivo} className="flex items-center gap-4">
                <div className="w-40 shrink-0 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorPorMotivo.get(m.motivo) }} />
                  <span className="text-xs text-slate-600 truncate">{m.motivo}</span>
                </div>
                <div className="flex-1 relative h-5 bg-slate-50 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg" style={{ width: `${Math.max(anchoBarra, 3)}%`, backgroundColor: colorPorMotivo.get(m.motivo), opacity: 0.85 }} />
                </div>
                <div className="w-14 text-right shrink-0">
                  <span className="text-sm font-bold text-slate-700">{porcentajesValor[i]}%</span>
                </div>
                <div className="w-20 text-right shrink-0">
                  <span className="text-xs text-slate-400">{fmtK(m.valorTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Funnel de conversión ──
  function Funnel() {
    // Sigue el orden configurable del pipeline (ETAPAS), excluyendo "Perdida"
    // que no forma parte del flujo de conversión.
    const etapasFunnel = ETAPAS.filter(e => e.key !== "PERDIDA");
    const vals = etapasFunnel.map(e => r!.oportunidadesPorEtapa[e.key] ?? 0);
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
            const label = etapa.label;
            const conv = i > 0 && vals[i - 1] > 0 ? Math.round((v / vals[i - 1]) * 100) : null;
            return (
              <g key={etapa.key}>
                <polygon
                  points={`${xIzq},${y + 2} ${xDer},${y + 2} ${xDerSig},${y + rowH - 2} ${xIzqSig},${y + rowH - 2}`}
                  fill={etapa.colorBar}
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
      <div className="bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 px-8 py-8 mb-8 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-brand-300 text-xs font-semibold uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-3xl font-bold text-white mb-1">Reporte comercial</h1>
            <p className="text-brand-300 text-sm">Período: <span className="text-white font-medium">{periodoLabel}</span></p>
          </div>

          {/* ── FILTROS ── */}
          <div className="flex flex-wrap items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-1.5 self-start">
            <div>
              <p className="text-brand-300 text-xs mb-1">Año</p>
              <select value={anio} onChange={e => { setAnio(e.target.value); setMes(""); cargar(e.target.value, ""); }}
                className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                <option value="">Todos</option>
                {r.aniosDisponibles.map(a => <option key={a} value={String(a)}>{a}</option>)}
              </select>
            </div>
            <div>
              <p className="text-brand-300 text-xs mb-1">Mes</p>
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
            {vendedores.length > 0 && (
              <div>
                <p className="text-brand-300 text-xs mb-1">Vendedor</p>
                <select value={vendedor} onChange={e => { setVendedor(e.target.value); cargar(anio, mes, e.target.value); }}
                  className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                  <option value="">Todos</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              </div>
            )}
            {r.segmentosDisponibles.length > 0 && (
              <div>
                <p className="text-brand-300 text-xs mb-1">Segmento</p>
                <select value={segmento} onChange={e => { setSegmento(e.target.value); cargar(anio, mes, vendedor, e.target.value, sede); }}
                  className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                  <option value="">Todos</option>
                  {r.segmentosDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {r.sedesDisponibles.length > 0 && (
              <div>
                <p className="text-brand-300 text-xs mb-1">Sede</p>
                <select value={sede} onChange={e => { setSede(e.target.value); cargar(anio, mes, vendedor, segmento, e.target.value); }}
                  className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                  <option value="">Todas</option>
                  {r.sedesDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            {(anio || mes || vendedor || segmento || sede) && (
              <button onClick={() => { setAnio(""); setMes(""); setVendedor(""); setSegmento(""); setSede(""); cargar("", "", "", "", ""); }}
                className="mt-4 text-brand-300 hover:text-white text-xs underline">
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* KPIs hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Clientes",       valor: r.totalEmpresas,       icon: IconBuilding,     sub: `${r.totalContactos} contactos`, destacado: false },
            { label: "En negociación", valor: r.cantidadActiva,      icon: IconRefresh,      sub: fmtK(r.valorActivo) + " potencial", destacado: false },
            { label: "Valor ganado",   valor: fmtK(r.valorGanado),   icon: IconCurrencyDollar, sub: `${r.ganadas} negocios cerrados`, destacado: false },
            { label: "Tasa de cierre", valor: `${r.tasaCierre}%`,    icon: IconTargetArrow,  sub: `${r.ganadas} ganadas · ${r.perdidas} perdidas`, destacado: true },
          ].map(k => {
            const Icono: Icon = k.icon;
            return (
              <div key={k.label} className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icono size={18} stroke={1.75} className="text-brand-200" />
                  <span className="text-xs text-brand-200 font-medium uppercase tracking-wide">{k.label}</span>
                </div>
                <p className={`text-2xl font-bold ${k.destacado ? "text-accent-400" : "text-white"}`}>{k.valor}</p>
                <p className="text-xs text-brand-300 mt-1">{k.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      <AnalisisTendenciasIA />
      <TendenciasGraficas />

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
              { label: "En juego", valor: r.valorActivo,  color: "bg-brand-500",   text: "text-brand-700" },
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
            {r.diasPromedioCierre !== null && (
              <p className="text-xs text-center text-slate-400 mt-1">Cierra en {r.diasPromedioCierre} día{r.diasPromedioCierre !== 1 ? "s" : ""} en promedio</p>
            )}
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <Funnel />
          </div>

          {/* Tareas */}
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${r.actividadesPendientes > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
            {r.actividadesPendientes > 0
              ? <IconClock size={22} stroke={1.75} className="text-amber-600" />
              : <IconCircleCheck size={22} stroke={1.75} className="text-emerald-600" />}
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

      {/* ── MOTIVOS DE PÉRDIDA ── */}
      {r.motivosPerdida.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">Motivos de pérdida</h2>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:flex-1 lg:min-w-0">
              <MotivosPerdidaDonut />
            </div>
            <div className="lg:flex-1 lg:min-w-0 lg:pl-8 lg:border-l lg:border-slate-100">
              <ValorPerdidoPorMotivo />
            </div>
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
              <p className="text-2xl font-bold text-accent-600">{fmtK(r.valorPonderado)}</p>
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
              <div className="h-3 rounded-full bg-brand-400" style={{ width: "100%" }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Pronóstico ponderado</span>
              <span className="font-semibold text-accent-600">{fmtK(r.valorPonderado)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-3 rounded-full bg-accent-500"
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
              {(() => {
                const etapasDesglose = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"];
                const maxBruto = Math.max(...etapasDesglose.map(k => r.forecastPorEtapa[k]?.valorBruto ?? 0), 1);
                return etapasDesglose.map(etapaKey => {
                  const fe = r.forecastPorEtapa[etapaKey];
                  if (!fe) return null;
                  const etapa = ETAPAS.find(e => e.key === etapaKey)!;
                  const pct = Math.round((fe.valorBruto / maxBruto) * 100);
                  return (
                    <div key={etapaKey} className="flex items-center gap-4">
                      <div className="w-24 shrink-0">
                        <p className="text-xs font-medium text-slate-700">{etapa.label}</p>
                        <p className="text-xs text-slate-400">{fe.cantidad} ops · {fe.probPromedio}% prom.</p>
                      </div>
                      <div className="flex-1 relative h-6 bg-slate-50 rounded-xl overflow-hidden">
                        <div className="h-full rounded-xl" style={{ width: `${Math.max(pct, fe.cantidad > 0 ? 3 : 0)}%`, backgroundColor: etapa.colorBar, opacity: 0.75 }} />
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <p className="text-xs font-bold text-slate-700">{fmtK(fe.valorPonderado)}</p>
                        <p className="text-xs text-slate-400">de {fmtK(fe.valorBruto)}</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── GRÁFICA MENSUAL ── */}
      <GraficaMensual />

      {/* ── PANEL METAS ── */}
      {(editMeta || metas.length > 0) && (
        <div className="mt-4 bg-white rounded-2xl border border-amber-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1.5"><IconTarget size={16} stroke={1.75} className="text-amber-600" /> Metas de ventas</h2>
          {editMeta && (
            <>
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
                <MoneyInput value={metaForm.valorObjetivo}
                  onChange={v => setMetaForm(f => ({ ...f, valorObjetivo: v }))}
                  placeholder="Ej: 50000000"
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm w-44 outline-none focus:border-amber-400" />
              </div>
              <button onClick={guardarMeta} disabled={!metaForm.valorObjetivo}
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                Guardar meta
              </button>
            </div>
            {metaForm.mes === "" && (
              <p className="text-xs text-slate-400 -mt-3 mb-5">
                Si no defines una meta anual manual, se calcula sola sumando las metas mensuales que sí tengas configuradas para ese año.
              </p>
            )}
            </>
          )}
          {metas.length > 0 && (
            <div className="flex flex-col gap-2">
              {metas.map(m => {
                const realAnual = m.mes === null
                  ? (r?.porAnio?.[m.anio]?.valorGanado ?? 0)
                  : r?.anioParaMes === m.anio ? (r?.porMes[m.mes!]?.valorGanado ?? 0) : 0;
                const pct = Math.round((realAnual / Number(m.valorObjetivo)) * 100);
                const pctBarra = Math.min(100, pct);
                const colorBarra = pct >= 100 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <div className="w-40 shrink-0">
                      <p className="text-xs font-medium text-slate-700">{m.mes ? `${MESES[m.mes - 1]} ${m.anio}` : `Año ${m.anio}`}</p>
                      {m.calculada && (
                        <p className="text-[10px] text-slate-400">calculada · {m.mesesConfigurados}/12 meses</p>
                      )}
                    </div>
                    <div className="flex-1 relative h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-5 rounded-full transition-all ${colorBarra}`} style={{ width: `${pctBarra}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">{pct}%</span>
                    </div>
                    <div className="w-36 text-right text-xs shrink-0">
                      <span className="font-bold text-slate-800">{fmtK(realAnual)}</span>
                      <span className="text-slate-400"> / {fmtK(Number(m.valorObjetivo))}</span>
                    </div>
                    {m.calculada || !esAdmin ? (
                      <span className="w-3.5" />
                    ) : (
                      <button onClick={() => eliminarMeta(m.anio, m.mes)}
                        className="text-slate-300 hover:text-red-400 text-sm">×</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CUMPLIMIENTO DE META ANUAL ── */}
      {aniosOrden.length > 0 && <GraficaMetaAnual />}

      {/* ── COMPARATIVA POR AÑO ── */}
      {aniosOrden.length > 1 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900">Comparativa por año</h2>
            <p className="text-xs text-slate-400 mt-0.5">Todos los años · {aniosOrden.join(", ")}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            <GraficaAnios metrica={v => v.ganadas}     titulo="Negocios ganados"  color="#10b981" />
            <GraficaAnios metrica={v => v.valorGanado} titulo="Valor ganado (COP)" color="#2f8ab0" />
            <GraficaAnios metrica={v => v.perdidas}    titulo="Negocios perdidos" color="#f87171" subirEsBueno={false} />
            <GraficaAnios metrica={v => v.total}       titulo="Total oportunidades" color="#d97328" />
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
                      <tr key={a} className={`${esActivo ? "bg-brand-50" : "hover:bg-slate-50"} transition-colors`}>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORES_ANIO[i % COLORES_ANIO.length] }} />
                            <span className="font-semibold text-slate-800">{a}</span>
                            {esActivo && <span className="text-xs bg-accent-600 text-white px-1.5 py-0.5 rounded-full">Filtrado</span>}
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

