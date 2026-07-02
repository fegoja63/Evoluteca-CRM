"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACCIONES = [
  { label: "Nueva actividad",   emoji: "📅", href: "/dashboard/agenda" },
  { label: "Nuevo cliente",     emoji: "🏢", href: "/dashboard/cuentas" },
  { label: "Nueva cotización",  emoji: "📋", href: "/dashboard/cotizaciones-formales/nueva" },
  { label: "Ver pipeline",      emoji: "◈",  href: "/dashboard/pipeline" },
];

export function Fab() {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:hidden flex flex-col items-end gap-2">
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          {ACCIONES.map(a => (
            <button key={a.href}
              onClick={() => { router.push(a.href); setAbierto(false); }}
              className="relative z-50 flex items-center gap-2 bg-white rounded-full shadow-lg border border-slate-200 pl-3 pr-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all animate-fade-in">
              <span className="text-base">{a.emoji}</span>
              {a.label}
            </button>
          ))}
        </>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        className={`relative z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl font-bold transition-all duration-200 ${abierto ? "bg-slate-700 text-white rotate-45" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
        +
      </button>
    </div>
  );
}
