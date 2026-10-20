"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconBuilding, IconChartFunnel, IconCalendar, IconFilePlus, IconCoin, IconUsersGroup, IconSettings, IconLifebuoy, type Icon } from "@tabler/icons-react";
import { INICIO_FINANZAS } from "@/lib/cuenta-finanzas";
import { cn } from "@/lib/cn";

const NAV_MOVIL: { href: string; icon: Icon; label: string }[] = [
  { href: "/dashboard",                       icon: IconLayoutDashboard, label: "Inicio" },
  { href: "/dashboard/cuentas",                icon: IconBuilding,       label: "Clientes" },
  { href: "/dashboard/pipeline",               icon: IconChartFunnel,    label: "Pipeline" },
  { href: "/dashboard/agenda",                 icon: IconCalendar,       label: "Agenda" },
  { href: "/dashboard/cotizaciones-formales",  icon: IconFilePlus,       label: "Cotizar" },
];

// Cuenta solo Finanzas: sin pantallas del CRM (ver lib/cuenta-finanzas).
const NAV_MOVIL_FINANZAS: { href: string; icon: Icon; label: string }[] = [
  { href: INICIO_FINANZAS,           icon: IconCoin,       label: "Finanzas" },
  { href: "/dashboard/equipo",        icon: IconUsersGroup, label: "Equipo" },
  { href: "/dashboard/configuracion", icon: IconSettings,   label: "Ajustes" },
  { href: "/dashboard/ayuda",         icon: IconLifebuoy,   label: "Ayuda" },
];

export function MobileNav({ soloFinanzas = false }: { soloFinanzas?: boolean }) {
  const pathname = usePathname();
  const items = soloFinanzas ? NAV_MOVIL_FINANZAS : NAV_MOVIL;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-brand-950 border-t border-white/10 flex sm:hidden">
      {items.map(item => {
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
            <span className="text-2xs font-medium leading-none">{item.label}</span>
            {activo && <span className="w-1 h-1 rounded-full bg-accent-400 mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
