"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { IconNote, IconCheck } from "@tabler/icons-react";

interface NotasRapidasProps {
  valor: string | null;
  onGuardar: (texto: string) => Promise<void>;
}

export function NotasRapidas({ valor, onGuardar }: NotasRapidasProps) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor ?? "");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTexto(valor ?? ""); }, [valor]);

  useEffect(() => {
    if (editando && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editando]);

  async function guardar() {
    if (texto === (valor ?? "")) { setEditando(false); return; }
    setGuardando(true);
    try {
      await onGuardar(texto);
    } catch (e) {
      // Si el guardado falló, se mantiene el editor abierto con lo escrito y
      // se avisa — nunca se muestra "Guardado" en falso.
      setGuardando(false);
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar las notas. Inténtalo de nuevo.");
      return;
    }
    setGuardando(false);
    setEditando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setTexto(valor ?? ""); setEditando(false); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) guardar();
  }

  return (
    <div className={tarjeta("p-5")}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <IconNote size={16} stroke={1.75} className="text-slate-500" />Notas
        </h3>
        <div className="flex items-center gap-2">
          {guardado && <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1"><IconCheck size={14} stroke={2} />Guardado</span>}
          {!editando
            ? <button onClick={() => setEditando(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                {texto ? "Editar" : "+ Agregar nota"}
              </button>
            : <div className="flex gap-2">
                <button onClick={() => { setTexto(valor ?? ""); setEditando(false); }}
                  className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                <button onClick={guardar} disabled={guardando}
                  className={boton("marca", "sm")}>
                  {guardando ? "..." : "Guardar"}
                </button>
              </div>
          }
        </div>
      </div>

      {editando ? (
        <textarea
          ref={ref}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe aquí tus notas... (Ctrl+Enter para guardar, Esc para cancelar)"
          rows={5}
          className={campo("md", "w-full resize-none leading-relaxed")}
        />
      ) : texto ? (
        <div onClick={() => setEditando(true)}
          className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap cursor-text rounded-xl hover:bg-slate-50 px-3 py-2.5 -mx-3 transition-colors min-h-[60px]">
          {texto}
        </div>
      ) : (
        <div onClick={() => setEditando(true)}
          className="text-sm text-slate-400 italic cursor-text rounded-xl hover:bg-slate-50 px-3 py-2.5 -mx-3 transition-colors min-h-[60px] flex items-center">
          Sin notas. Haz clic para agregar...
        </div>
      )}

      {editando && (
        <p className="text-xs text-slate-400 mt-1.5">Ctrl+Enter para guardar · Esc para cancelar</p>
      )}
    </div>
  );
}
