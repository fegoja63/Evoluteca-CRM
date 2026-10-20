"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const PESTANAS = [
  { href: "/dashboard/finanzas", label: "Resumen" },
  { href: "/dashboard/finanzas/caja", label: "Caja proyectada" },
  { href: "/dashboard/finanzas/estados", label: "Estados financieros" },
  { href: "/dashboard/finanzas/indicadores", label: "Indicadores" },
  { href: "/dashboard/finanzas/gerente", label: "Gerente IA" },
  { href: "/dashboard/finanzas/cargar", label: "Cargar datos" },
];

export function PestanasFinanzas() {
  const pathname = usePathname();
  return (
    // En el celular las pestañas se desplazan con el dedo; sin barra visible.
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del Gerente Financiero">
      {PESTANAS.map(p => {
        const activa = pathname === p.href;
        return (
          <Link key={p.href} href={p.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activa ? "border-accent-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800",
            )}>
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
