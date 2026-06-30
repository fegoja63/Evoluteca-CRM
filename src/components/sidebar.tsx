"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", emoji: "▦" },
  { href: "/dashboard/cuentas", label: "Cuentas", emoji: "🏢" },
  { href: "/dashboard/contactos", label: "Contactos", emoji: "👤" },
  { href: "/dashboard/pipeline", label: "Pipeline", emoji: "◈" },
  { href: "/dashboard/agenda", label: "Agenda", emoji: "📅" },
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", emoji: "📄" },
  { href: "/dashboard/reportes", label: "Reportes", emoji: "📊" },
  { href: "/dashboard/equipo", label: "Equipo", emoji: "👥" },
];

export function Sidebar({ tenantNombre }: { tenantNombre: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-screen w-56 flex-col bg-slate-900 text-white">
      <div className="px-5 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-xs font-bold">E</div>
          <span className="text-sm font-semibold tracking-tight">Evoluteca CRM</span>
        </div>
        <div className="text-xs text-slate-400 mt-1 pl-9">{tenantNombre}</div>
        <a
          href="https://www.felipegomezjaramillo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors pl-9 block mt-0.5"
        >
          felipegomezjaramillo.com
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const activo = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activo
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className="text-base leading-none">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-4 border-t border-slate-700/50">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span className="text-base leading-none">↩</span>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
