import { COLUMNAS_PLANTILLA } from "@/lib/finanzas/plantilla";
import type { Periodo } from "@/lib/finanzas/estados";
import { millones, mesCorto } from "@/lib/finanzas/formato";

export const MONTOS = COLUMNAS_PLANTILLA.slice(1) as readonly { clave: Exclude<keyof Periodo, "mes">; titulo: string }[];

// Monto como lo escribe un colombiano: "4.800.000".
export const aTexto = (v: number) => (v ? Math.round(v).toLocaleString("es-CO") : "");

export async function enviar(url: string, metodo: string, cuerpo?: unknown) {
  const res = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo guardar. Revise su conexión e inténtelo de nuevo.");
  return data;
}

export function TablaMeses({ periodos, acciones }: { periodos: Periodo[]; acciones?: (p: Periodo) => React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Mes</th>
            {MONTOS.map(c => <th key={c.clave} className="whitespace-nowrap px-3 py-2 text-right font-semibold">{c.titulo}</th>)}
            {acciones && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {periodos.map(p => (
            <tr key={p.mes}>
              <td className="whitespace-nowrap px-3 py-1.5 font-medium text-slate-700">{mesCorto(p.mes)}</td>
              {MONTOS.map(c => <td key={c.clave} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{millones(p[c.clave])}</td>)}
              {acciones && <td className="whitespace-nowrap px-3 py-1.5 text-right">{acciones(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
