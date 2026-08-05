"use client";

import { useEffect, useState } from "react";
import type { TipoCampo, EntidadCampo } from "@/lib/campos-personalizados";

type Def = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  obligatorio: boolean;
  activo: boolean;
};

// Pinta los campos personalizados definidos para una entidad como inputs
// tipados, dentro del formulario de edición de esa entidad. El estado de los
// valores lo lleva el formulario padre (clave -> valor string); aquí solo se
// renderiza y se notifican cambios. Si el tenant no tiene campos, no pinta nada.
export function CamposPersonalizadosForm({
  entidad,
  valores,
  onChange,
}: {
  entidad: EntidadCampo;
  valores: Record<string, string>;
  onChange: (clave: string, valor: string) => void;
}) {
  const [defs, setDefs] = useState<Def[]>([]);

  useEffect(() => {
    fetch(`/api/campos-personalizados?entidad=${entidad}`)
      .then(r => r.json())
      .then(d => setDefs(Array.isArray(d) ? d.filter((x: Def) => x.activo) : []))
      .catch(() => setDefs([]));
  }, [entidad]);

  if (defs.length === 0) return null;

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="col-span-2 border-t border-slate-200 pt-3 mt-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Campos personalizados</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {defs.map(def => {
          const val = valores[def.clave] ?? "";
          const etiqueta = (
            <label className="mb-1 block text-xs text-slate-500">
              {def.etiqueta}{def.obligatorio && <span className="text-red-500"> *</span>}
            </label>
          );

          if (def.tipo === "BOOLEANO") {
            return (
              <label key={def.id} className="flex items-center gap-2 pt-5 cursor-pointer">
                <input type="checkbox" checked={val === "true"}
                  onChange={e => onChange(def.clave, e.target.checked ? "true" : "false")}
                  className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-slate-600">
                  {def.etiqueta}{def.obligatorio && <span className="text-red-500"> *</span>}
                </span>
              </label>
            );
          }

          if (def.tipo === "LISTA") {
            return (
              <div key={def.id}>
                {etiqueta}
                <select value={val} onChange={e => onChange(def.clave, e.target.value)} className={`${inputCls} bg-white`}>
                  <option value="">— Sin valor —</option>
                  {def.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          }

          const type = def.tipo === "NUMERO" ? "number" : def.tipo === "FECHA" ? "date" : "text";
          return (
            <div key={def.id}>
              {etiqueta}
              <input type={type} value={val} onChange={e => onChange(def.clave, e.target.value)} className={inputCls} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
