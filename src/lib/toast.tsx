"use client";

import { useEffect, useState } from "react";
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from "@tabler/icons-react";

// Sistema de avisos (toasts) sin dependencias externas. Reemplaza los
// alert() nativos por notificaciones no bloqueantes en la esquina inferior
// derecha, que desaparecen solas. Se usa como `toast.error("...")`,
// `toast.success("...")` o `toast.info("...")` desde cualquier parte del
// cliente. El <Toaster/> se monta una sola vez en el layout del dashboard.

type Tipo = "error" | "success" | "info";
type Toast = { id: number; mensaje: string; tipo: Tipo };

let idSeq = 0;
const listeners = new Set<(t: Toast) => void>();

function emitir(mensaje: string, tipo: Tipo) {
  listeners.forEach((l) => l({ id: ++idSeq, mensaje, tipo }));
}

export const toast = {
  error: (m: string) => emitir(m, "error"),
  success: (m: string) => emitir(m, "success"),
  info: (m: string) => emitir(m, "info"),
};

const ESTILOS: Record<Tipo, { barra: string; icono: React.ReactNode }> = {
  error:   { barra: "border-l-red-500",     icono: <IconAlertTriangle size={18} stroke={1.75} className="text-red-500 shrink-0" /> },
  success: { barra: "border-l-emerald-500", icono: <IconCircleCheck size={18} stroke={1.75} className="text-emerald-500 shrink-0" /> },
  info:    { barra: "border-l-brand-500",   icono: <IconInfoCircle size={18} stroke={1.75} className="text-brand-500 shrink-0" /> },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const l = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      // Los errores duran un poco más para dar tiempo a leerlos.
      const dur = t.tipo === "error" ? 6000 : 4000;
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), dur);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  function cerrar(id: number) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          onClick={() => cerrar(t.id)}
          className={`toast-in pointer-events-auto cursor-pointer flex items-start gap-2.5 rounded-xl border-l-4 ${ESTILOS[t.tipo].barra} ring-1 ring-slate-200 bg-white px-4 py-3 shadow-lg`}
        >
          {ESTILOS[t.tipo].icono}
          <p className="flex-1 text-sm text-slate-700 leading-snug">{t.mensaje}</p>
          <button onClick={() => cerrar(t.id)} className="text-slate-300 hover:text-slate-500 shrink-0" aria-label="Cerrar">
            <IconX size={16} stroke={1.75} />
          </button>
        </div>
      ))}
    </div>
  );
}
