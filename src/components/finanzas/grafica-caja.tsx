"use client";

import { useState } from "react";
import type { Semana } from "@/lib/finanzas/caja";
import { diaCorto, millones } from "@/lib/finanzas/formato";

const ANCHO = 640;
const ALTO = 220;
const M = { arriba: 12, abajo: 26, izq: 64, der: 18 };

type Props = {
  con: Semana[];
  sin: Semana[];
  /** false = no se dibuja la línea de comparación. */
  conPipeline: boolean;
  /** Etiquetas de las dos líneas (el simulador compara simulado vs. actual). */
  etiquetas?: { principal: string; comparacion: string };
};

/**
 * Saldo de caja al cierre de cada semana: el escenario principal (línea con
 * área) y el de comparación (punteado). Al pasar el mouse o tocar una semana
 * muestra los dos saldos. SVG sin librerías.
 */
export function GraficaCaja({ con, sin, conPipeline, etiquetas }: Props) {
  const [activa, setActiva] = useState<number | null>(null);
  const valores = [...con.map(s => s.saldo), ...(conPipeline ? sin.map(s => s.saldo) : []), 0];
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const paso = (ANCHO - M.izq - M.der) / Math.max(1, con.length - 1);
  const x = (i: number) => M.izq + i * paso;
  const y = (v: number) => M.arriba + ((max - v) * (ALTO - M.arriba - M.abajo)) / rango;
  const linea = (ss: Semana[]) => ss.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.saldo).toFixed(1)}`).join(" ");
  const area = `${linea(con)} L${x(con.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const marcas = [max, (max + min) / 2, min];
  const principal = etiquetas?.principal ?? (conPipeline ? "Con pipeline (escenario actual)" : "Escenario actual");
  const comparacion = etiquetas?.comparacion ?? "Sin negocios nuevos";

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-600" />{principal}</span>
        {conPipeline && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />{comparacion}</span>}
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-red-500" />Cero</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="mt-2 h-auto w-full" role="img"
          aria-label="Saldo de caja proyectado al cierre de cada semana" onMouseLeave={() => setActiva(null)}>
          {marcas.map(v => (
            <g key={v}>
              <line x1={M.izq} x2={ANCHO - M.der} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeWidth={1} />
              <text x={M.izq - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{millones(v)}</text>
            </g>
          ))}
          <path d={area} className="fill-brand-600/10" />
          <line x1={M.izq} x2={ANCHO - M.der} y1={y(0)} y2={y(0)} className="stroke-red-500" strokeWidth={1} strokeDasharray="3 3" />
          {conPipeline && <path d={linea(sin)} fill="none" className="stroke-slate-400" strokeWidth={2} strokeDasharray="6 5" />}
          <path d={linea(con)} fill="none" className="stroke-brand-600" strokeWidth={2.5} />
          {activa !== null && <line x1={x(activa)} x2={x(activa)} y1={M.arriba} y2={ALTO - M.abajo} className="stroke-slate-300" strokeWidth={1} />}
          {con.map((s, i) => (
            <circle key={s.inicio} cx={x(i)} cy={y(s.saldo)} r={activa === i ? 5 : 3} className={s.saldo < 0 ? "fill-red-500" : "fill-brand-600"} />
          ))}
          {con.map((s, i) => i % 2 === 0 && (
            <text key={`t${s.inicio}`} x={x(i)} y={ALTO - 6} textAnchor={i === con.length - 1 ? "end" : "middle"} className="fill-slate-400 text-[10px]">{diaCorto(s.inicio)}</text>
          ))}
          {/* Franjas invisibles por semana para el mouse y el dedo. */}
          {con.map((s, i) => (
            <rect key={`h${s.inicio}`} x={x(i) - paso / 2} y={0} width={paso} height={ALTO} fill="transparent"
              onMouseEnter={() => setActiva(i)} onClick={() => setActiva(i)} />
          ))}
        </svg>
        {activa !== null && (
          <div className="pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
            style={{ left: `${(x(activa) / ANCHO) * 100}%`, transform: activa > con.length / 2 ? "translateX(-105%)" : "translateX(5%)" }}>
            <p className="font-semibold text-slate-700">Semana del {diaCorto(con[activa].inicio)}</p>
            <p className={con[activa].saldo < 0 ? "text-red-600" : "text-slate-700"}>{principal}: <span className="tabular-nums">{millones(con[activa].saldo)}</span></p>
            {conPipeline && <p className="text-slate-500">{comparacion}: <span className="tabular-nums">{millones(sin[activa].saldo)}</span></p>}
          </div>
        )}
      </div>
    </div>
  );
}
