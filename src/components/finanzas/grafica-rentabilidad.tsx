import { MARGEN_BAJO, MARGEN_SANO, type ClienteAnalizado } from "@/lib/finanzas/rentabilidad";

const ANCHO = 640;
const FILA = 26;
const M = { izq: 150, der: 44, arriba: 6, abajo: 18 };

/**
 * Margen bruto por cliente, de menor a mayor: barras horizontales, en rojo
 * las de margen bajo (< 25 %). La línea punteada marca el margen sano (35 %).
 */
export function GraficaRentabilidad({ clientes }: { clientes: ClienteAnalizado[] }) {
  const orden = [...clientes].sort((a, b) => a.margen - b.margen).slice(0, 15);
  const alto = M.arriba + orden.length * FILA + M.abajo;
  const max = Math.max(MARGEN_SANO + 0.1, ...orden.map(c => c.margen));
  const min = Math.min(0, ...orden.map(c => c.margen));
  const x = (v: number) => M.izq + ((v - min) / (max - min)) * (ANCHO - M.izq - M.der);
  const recorte = (t: string) => (t.length > 22 ? `${t.slice(0, 21)}…` : t);

  return (
    <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="h-auto w-full" role="img" aria-label="Margen bruto por cliente">
      <line x1={x(MARGEN_SANO)} x2={x(MARGEN_SANO)} y1={M.arriba} y2={alto - M.abajo} className="stroke-emerald-500" strokeDasharray="4 4" />
      <text x={x(MARGEN_SANO)} y={alto - 4} textAnchor="middle" className="fill-slate-400 text-[10px]">{Math.round(MARGEN_SANO * 100)}% sano</text>
      {orden.map((c, i) => {
        const y = M.arriba + i * FILA;
        const desde = x(Math.min(0, c.margen));
        const hasta = x(Math.max(0, c.margen));
        return (
          <g key={c.cliente}>
            <text x={M.izq - 8} y={y + FILA / 2 + 4} textAnchor="end" className="fill-slate-600 text-[11px]">{recorte(c.cliente)}</text>
            <rect x={desde} y={y + 5} width={Math.max(1, hasta - desde)} height={FILA - 10} rx={3}
              className={c.margen < MARGEN_BAJO ? "fill-accent-600" : "fill-brand-600"}>
              <title>{`${c.cliente}: margen ${Math.round(c.margen * 100)}%`}</title>
            </rect>
            <text x={hasta + 6} y={y + FILA / 2 + 4} className="fill-slate-700 text-[11px]">{Math.round(c.margen * 100)}%</text>
          </g>
        );
      })}
    </svg>
  );
}
