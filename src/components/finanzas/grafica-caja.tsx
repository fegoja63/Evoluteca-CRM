import type { Semana } from "@/lib/finanzas/caja";
import { diaCorto, millones } from "@/lib/finanzas/formato";

const ANCHO = 640;
const ALTO = 220;
const M = { arriba: 12, abajo: 26, izq: 64, der: 12 };

/**
 * Saldo de caja al cierre de cada semana: escenario actual (con pipeline) y
 * "sin negocios nuevos". SVG dibujado en el servidor, sin librerías.
 */
type Props = {
  con: Semana[];
  sin: Semana[];
  /** false = no se dibuja la línea de comparación. */
  conPipeline: boolean;
  /** Etiquetas de las dos líneas (el simulador compara simulado vs. actual). */
  etiquetas?: { principal: string; comparacion: string };
};

export function GraficaCaja({ con, sin, conPipeline, etiquetas }: Props) {
  const valores = [...con.map(s => s.saldo), ...sin.map(s => s.saldo), 0];
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;
  const x = (i: number) => M.izq + (i * (ANCHO - M.izq - M.der)) / Math.max(1, con.length - 1);
  const y = (v: number) => M.arriba + ((max - v) * (ALTO - M.arriba - M.abajo)) / rango;
  const linea = (ss: Semana[]) => ss.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.saldo).toFixed(1)}`).join(" ");
  const marcas = [max, (max + min) / 2, min];

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-brand-600" />{etiquetas?.principal ?? (conPipeline ? "Con pipeline (escenario actual)" : "Escenario actual")}</span>
        {conPipeline && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />{etiquetas?.comparacion ?? "Sin negocios nuevos"}</span>}
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-red-500" />Cero</span>
      </div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="mt-2 h-auto w-full" role="img" aria-label="Saldo de caja proyectado al cierre de cada semana">
        {marcas.map(v => (
          <g key={v}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeWidth={1} />
            <text x={M.izq - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{millones(v)}</text>
          </g>
        ))}
        <line x1={M.izq} x2={ANCHO - M.der} y1={y(0)} y2={y(0)} className="stroke-red-500" strokeWidth={1} strokeDasharray="3 3" />
        {conPipeline && <path d={linea(sin)} fill="none" className="stroke-slate-400" strokeWidth={2} strokeDasharray="6 5" />}
        <path d={linea(con)} fill="none" className="stroke-brand-600" strokeWidth={2.5} />
        {con.map((s, i) => (
          <circle key={s.inicio} cx={x(i)} cy={y(s.saldo)} r={3} className={s.saldo < 0 ? "fill-red-500" : "fill-brand-600"}>
            <title>{`Semana del ${diaCorto(s.inicio)}: ${millones(s.saldo)}`}</title>
          </circle>
        ))}
        {con.map((s, i) => i % 2 === 0 && (
          <text key={`t${s.inicio}`} x={x(i)} y={ALTO - 6} textAnchor={i === con.length - 1 ? "end" : "middle"} className="fill-slate-400 text-[10px]">{diaCorto(s.inicio)}</text>
        ))}
      </svg>
    </div>
  );
}
