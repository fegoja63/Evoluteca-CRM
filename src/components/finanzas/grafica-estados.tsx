import type { Resultado } from "@/lib/finanzas/estados";
import { mesCorto, millones } from "@/lib/finanzas/formato";

const ANCHO = 640;
const ALTO = 230;
const M = { arriba: 12, abajo: 24, izq: 58, der: 40 };

/**
 * Ventas y costo de ventas por mes (barras, eje izquierdo) y margen EBITDA %
 * (línea, eje derecho). SVG dibujado en el servidor, sin librerías.
 */
export function GraficaEstados({ meses }: { meses: Resultado[] }) {
  const n = meses.length;
  const maxV = Math.max(1, ...meses.map(m => Math.max(m.ventas, m.costoVentas)));
  const margenes = meses.map(m => (m.ventas ? (m.ebitda / m.ventas) * 100 : 0));
  const minM = Math.min(0, ...margenes);
  const maxM = Math.max(10, ...margenes);
  const anchoGrupo = (ANCHO - M.izq - M.der) / Math.max(1, n);
  const barra = Math.min(18, anchoGrupo * 0.32);
  const xc = (i: number) => M.izq + anchoGrupo * (i + 0.5);
  const yV = (v: number) => M.arriba + (1 - v / maxV) * (ALTO - M.arriba - M.abajo);
  const yM = (v: number) => M.arriba + ((maxM - v) / (maxM - minM)) * (ALTO - M.arriba - M.abajo);
  const base = yV(0);
  const linea = margenes.map((v, i) => `${i ? "L" : "M"}${xc(i).toFixed(1)},${yM(v).toFixed(1)}`).join(" ");

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Ventas</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />Costo de ventas</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent-600" />Margen EBITDA (eje derecho)</span>
      </div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="mt-2 h-auto w-full" role="img" aria-label="Ventas, costo de ventas y margen EBITDA de cada mes">
        {[maxV, maxV / 2, 0].map(v => (
          <g key={`v${v}`}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={yV(v)} y2={yV(v)} className="stroke-slate-200" strokeWidth={1} />
            <text x={M.izq - 6} y={yV(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{millones(v)}</text>
          </g>
        ))}
        {[maxM, minM].map(v => (
          <text key={`m${v}`} x={ANCHO - M.der + 6} y={yM(v) + 4} className="fill-slate-400 text-[10px]">{Math.round(v)}%</text>
        ))}
        {meses.map((m, i) => (
          <g key={m.mes}>
            <rect x={xc(i) - barra - 1} y={yV(m.ventas)} width={barra} height={Math.max(0, base - yV(m.ventas))} rx={2} className="fill-brand-600">
              <title>{`${mesCorto(m.mes)} · ventas ${millones(m.ventas)}`}</title>
            </rect>
            <rect x={xc(i) + 1} y={yV(m.costoVentas)} width={barra} height={Math.max(0, base - yV(m.costoVentas))} rx={2} className="fill-slate-400">
              <title>{`${mesCorto(m.mes)} · costo ${millones(m.costoVentas)}`}</title>
            </rect>
            <text x={xc(i)} y={ALTO - 6} textAnchor="middle" className="fill-slate-400 text-[10px]">{mesCorto(m.mes)}</text>
          </g>
        ))}
        <path d={linea} fill="none" className="stroke-accent-600" strokeWidth={2.5} />
        {margenes.map((v, i) => (
          <circle key={meses[i].mes} cx={xc(i)} cy={yM(v)} r={3} className="fill-accent-600">
            <title>{`${mesCorto(meses[i].mes)} · margen EBITDA ${v.toFixed(1).replace(".", ",")}%`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
