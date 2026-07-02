"use client";

import { useState, useRef, KeyboardEvent } from "react";

const COLORES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-600",
];

function colorForTag(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % COLORES.length;
  return COLORES[h];
}

interface Props {
  etiquetas: string[];
  onGuardar: (etiquetas: string[]) => Promise<void>;
  readonly?: boolean;
}

export function Etiquetas({ etiquetas, onGuardar, readonly }: Props) {
  const [lista, setLista]     = useState<string[]>(etiquetas);
  const [input, setInput]     = useState("");
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function agregar() {
    const tag = input.trim();
    if (!tag || lista.includes(tag)) { setInput(""); return; }
    setLista(prev => [...prev, tag]);
    setInput("");
  }

  function quitar(tag: string) {
    setLista(prev => prev.filter(t => t !== tag));
  }

  async function guardar() {
    setGuardando(true);
    await onGuardar(lista);
    setGuardando(false);
    setEditando(false);
  }

  function cancelar() {
    setLista(etiquetas);
    setInput("");
    setEditando(false);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); agregar(); }
    if (e.key === "Escape") cancelar();
  }

  if (!editando) {
    return (
      <div
        className="flex flex-wrap gap-1.5 min-h-[28px] cursor-pointer group"
        onClick={() => { if (!readonly) { setEditando(true); setTimeout(() => inputRef.current?.focus(), 50); } }}
      >
        {lista.length === 0 && !readonly && (
          <span className="text-xs text-slate-300 group-hover:text-slate-400 italic">+ Agregar etiquetas</span>
        )}
        {lista.map(tag => (
          <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorForTag(tag)}`}>
            {tag}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {lista.map(tag => (
          <span key={tag} className={`rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1 ${colorForTag(tag)}`}>
            {tag}
            <button onClick={() => quitar(tag)} className="hover:opacity-70 font-bold leading-none">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escribe y presiona Enter..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
        />
        <button onClick={agregar} className="text-xs text-blue-600 hover:underline px-1">+ Agregar</button>
        <button onClick={guardar} disabled={guardando}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "..." : "Guardar"}
        </button>
        <button onClick={cancelar} className="text-xs text-slate-400 hover:text-slate-700">Cancelar</button>
      </div>
      <p className="text-xs text-slate-400 mt-1">Presiona Enter o coma para agregar. Haz clic en × para quitar.</p>
    </div>
  );
}
