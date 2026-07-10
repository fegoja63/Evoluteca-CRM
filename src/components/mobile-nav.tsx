"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconBuilding, IconChartFunnel, IconCalendar, IconFilePlus, type Icon } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

const NAV_MOVIL: { href: string; icon: Icon; label: string }[] = [
  { href: "/dashboard",                       icon: IconLayoutDashboard, label: "Inicio" },
  { href: "/dashboard/cuentas",                icon: IconBuilding,       label: "Clientes" },
  { href: "/dashboard/pipeline",               icon: IconChartFunnel,    label: "Pipeline" },
  { href: "/dashboard/agenda",                 icon: IconCalendar,       label: "Agenda" },
  { href: "/dashboard/cotizaciones-formales",  icon: IconFilePlus,       label: "Cotizar" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-brand-950 border-t border-white/10 flex sm:hidden">
      {NAV_MOVIL.map(item => {
        const activo = pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icono = item.icon;
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-center transition-colors",
              activo ? "text-accent-400" : "text-brand-400 hover:text-brand-200"
            )}>
            <Icono size={20} stroke={1.75} />
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
            {activo && <span className="w-1 h-1 rounded-full bg-accent-400 mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
