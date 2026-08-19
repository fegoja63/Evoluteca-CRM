"use client";

import { IconArrowUp, IconArrowDown, IconX, IconPlus } from "@tabler/icons-react";
import type { SeccionCuerpo } from "@/lib/cuerpo-cotizacion";

// Editor reutilizable de las secciones (título + contenido) del cuerpo de una
// cotización: agregar, quitar, reordenar y editar. Se usa en Configuración
// (plantilla del tenant) y en Nueva cotización / detalle (cuerpo por cotización).
// Todos los botones son type="button" para no disparar el submit del formulario
// que lo contiene.
type Props = {
  secciones: SeccionCuerpo[];
  onChange: (secciones: SeccionCuerpo[]) => void;
  disabled?: boolean;
};

export function EditorSeccionesCotizacion({ secciones, onChange, disabled = false }: Props) {
  function update(i: number, campo: keyof SeccionCuerpo, valor: string) {
    onChange(secciones.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)));
  }
  function remove(i: number) {
    onChange(secciones.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...secciones, { titulo: "", contenido: "" }]);
  }
  function mover(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= secciones.length) return;
    const copia = [...secciones];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onChange(copia);
  }

  return (
    <div className="flex flex-col gap-3">
      {secciones.map((s, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={s.titulo}
              onChange={e => update(i, "titulo", e.target.value)}
              disabled={disabled}
              placeholder="Título de la sección (ej: Condiciones comerciales)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-brand-500 disabled:opacity-60"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <button type="button" onClick={() => mover(i, -1)} disabled={disabled || i === 0}
                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Subir">
                <IconArrowUp size={16} stroke={1.75} />
              </button>
              <button type="button" onClick={() => mover(i, 1)} disabled={disabled || i === secciones.length - 1}
                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30" title="Bajar">
                <IconArrowDown size={16} stroke={1.75} />
              </button>
              <button type="button" onClick={() => remove(i)} disabled={disabled}
                className="p-1.5 text-slate-300 hover:text-red-500 disabled:opacity-30" title="Quitar sección">
                <IconX size={16} stroke={1.75} />
              </button>
            </div>
          </div>
          <textarea
            value={s.contenido}
            onChange={e => update(i, "contenido", e.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="Escribe el texto de esta sección. Cada salto de línea se muestra como un punto/párrafo."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 disabled:opacity-60 resize-y"
          />
        </div>
      ))}
      {!disabled && (
        <button type="button" onClick={add}
          className="self-start inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <IconPlus size={16} stroke={1.75} /> Agregar sección
        </button>
      )}
    </div>
  );
}
