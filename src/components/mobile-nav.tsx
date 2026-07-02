"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV_MOVIL = [
  { href: "/dashboard",                    emoji: "▦",  label: "Inicio" },
  { href: "/dashboard/cuentas",            emoji: "🏢", label: "Clientes" },
  { href: "/dashboard/pipeline",           emoji: "◈",  label: "Pipeline" },
  { href: "/dashboard/agenda",             emoji: "📅", label: "Agenda" },
  { href: "/dashboard/cotizaciones-formales", emoji: "📋", label: "Cotizar" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-blue-950 border-t border-blue-900 flex sm:hidden">
      {NAV_MOVIL.map(item => {
        const activo = pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-center transition-colors",
              activo ? "text-white" : "text-blue-400 hover:text-blue-200"
            )}>
            <span className={cn("text-xl leading-none", activo && "drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]")}>{item.emoji}</span>
            <span className="text-[9px] font-medium leading-none">{item.label}</span>
            {activo && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
