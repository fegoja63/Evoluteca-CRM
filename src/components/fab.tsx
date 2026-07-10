"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCalendarPlus, IconBuildingPlus, IconFilePlus, IconChartFunnel, IconPlus, type Icon } from "@tabler/icons-react";

const ACCIONES: { label: string; icon: Icon; href: string }[] = [
  { label: "Nueva actividad",   icon: IconCalendarPlus,  href: "/dashboard/agenda" },
  { label: "Nuevo cliente",     icon: IconBuildingPlus,  href: "/dashboard/cuentas" },
  { label: "Nueva cotización",  icon: IconFilePlus,      href: "/dashboard/cotizaciones-formales/nueva" },
  { label: "Ver pipeline",      icon: IconChartFunnel,   href: "/dashboard/pipeline" },
];

export function Fab() {
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:hidden flex flex-col items-end gap-2">
      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          {ACCIONES.map(a => {
            const Icono = a.icon;
            return (
              <button key={a.href}
                onClick={() => { router.push(a.href); setAbierto(false); }}
                className="relative z-50 flex items-center gap-2 bg-white rounded-full shadow-lg border border-slate-200 pl-3 pr-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all animate-fade-in">
                <Icono size={17} stroke={1.75} className="text-brand-600" />
                {a.label}
              </button>
            );
          })}
        </>
      )}
      <button
        onClick={() => setAbierto(!abierto)}
        className={`relative z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${abierto ? "bg-slate-700 text-white rotate-45" : "bg-accent-600 text-white hover:bg-accent-700"}`}>
        <IconPlus size={26} stroke={2} />
      </button>
    </div>
  );
}
