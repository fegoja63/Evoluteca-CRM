"use client";

import { useEffect, useState } from "react";
import { formatearValorCampo, type TipoCampo, type EntidadCampo } from "@/lib/campos-personalizados";

type Def = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  opciones: string[];
  obligatorio: boolean;
  activo: boolean;
};

// Muestra en solo lectura los campos personalizados que tengan valor, con su
// etiqueta y formato según el tipo. Se usa en las fichas de Cliente y
// Oportunidad. No pinta nada si no hay campos con valor.
export function CamposPersonalizadosVista({
  entidad,
  extras,
}: {
  entidad: EntidadCampo;
  extras: Record<string, string> | null | undefined;
}) {
  const [defs, setDefs] = useState<Def[]>([]);

  useEffect(() => {
    fetch(`/api/campos-personalizados?entidad=${entidad}`)
      .then(r => r.json())
      .then(d => setDefs(Array.isArray(d) ? d.filter((x: Def) => x.activo) : []))
      .catch(() => setDefs([]));
  }, [entidad]);

  const conValor = defs.filter(d => (extras?.[d.clave] ?? "") !== "");
  if (conValor.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-4">
      <h3 className="text-sm font-bold text-slate-900 mb-3">Datos personalizados</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {conValor.map(d => (
          <div key={d.id} className="flex flex-col">
            <span className="text-xs text-slate-400">{d.etiqueta}</span>
            <span className="text-sm text-slate-800 font-medium">{formatearValorCampo(d.tipo, extras![d.clave])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
