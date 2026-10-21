"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const PESTANAS = [
  { href: "/dashboard/finanzas", label: "Resumen" },
  { href: "/dashboard/finanzas/caja", label: "Caja proyectada" },
  { href: "/dashboard/finanzas/estados", label: "Estados financieros" },
  { href: "/dashboard/finanzas/indicadores", label: "Indicadores" },
  { href: "/dashboard/finanzas/clientes", label: "Rentabilidad por cliente" },
  { href: "/dashboard/finanzas/gerente", label: "Gerente IA" },
  { href: "/dashboard/finanzas/cargar", label: "Cargar datos" },
];

export function PestanasFinanzas() {
  const pathname = usePathname();
  return (
    // En el celular las pestañas se desplazan con el dedo; sin barra visible.
    <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del Gerente Financiero">
      {PESTANAS.map(p => {
        const activa = pathname === p.href;
        return (
          <Link key={p.href} href={p.href} aria-current={activa ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors",
              activa
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800",
            )}>
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
