"use client";

import { IconPlus } from "@tabler/icons-react";
import { MoneyInput } from "@/components/money-input";

// Editor de líneas/ítems reutilizable (descripción, cantidad, precio unitario).
// Lo usan tanto las Plantillas como la edición de ítems de una Cotización, para
// que la experiencia sea idéntica en ambos lados.
export type Linea = { descripcion: string; cantidad: string; precioUnit: string };

export const LINEA_VACIA: Linea = { descripcion: "", cantidad: "1", precioUnit: "" };

export function LineasEditor({ lineas, onChange }: { lineas: Linea[]; onChange: (lineas: Linea[]) => void }) {
  function updateLinea(i: number, campo: keyof Linea, val: string) {
    onChange(lineas.map((l, idx) => idx === i ? { ...l, [campo]: val } : l));
  }
  function addLinea() {
    onChange([...lineas, { ...LINEA_VACIA }]);
  }
  function removeLinea(i: number) {
    onChange(lineas.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">Ítems</label>
      <div className="flex flex-col gap-2">
        {lineas.map((linea, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_130px_auto] gap-2 items-center">
            <input type="text" placeholder="Ej: Iluminación escénica" value={linea.descripcion}
              onChange={e => updateLinea(i, "descripcion", e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <input type="number" min={1} value={linea.cantidad}
              onChange={e => updateLinea(i, "cantidad", e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-center" />
            <MoneyInput placeholder="0" value={linea.precioUnit}
              onChange={v => updateLinea(i, "precioUnit", v)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 text-right" />
            <button type="button" onClick={() => removeLinea(i)} disabled={lineas.length === 1}
              className="text-slate-300 hover:text-red-500 disabled:opacity-30 text-lg font-bold leading-none">
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addLinea} className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <IconPlus size={14} stroke={2} /> Línea vacía
      </button>
    </div>
  );
}
