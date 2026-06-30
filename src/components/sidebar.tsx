"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/dashboard/cuentas", label: "Cuentas", icon: "building" },
  { href: "/dashboard/contactos", label: "Contactos", icon: "users" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "chart-arrows" },
  { href: "/dashboard/agenda", label: "Agenda", icon: "calendar" },
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: "file-invoice" },
  { href: "/dashboard/reportes", label: "Reportes", icon: "chart-bar" },
  { href: "/dashboard/equipo", label: "Equipo", icon: "users-group" },
];

export function Sidebar({
  tenantNombre,
}: {
  tenantNombre: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex h-screen w-52 flex-col gap-0.5 border-r border-neutral-200 bg-neutral-50 py-4">
      <div className="mb-2 border-b border-neutral-200 px-4 pb-4">
        <div className="text-sm font-medium text-neutral-900">
          Evoluteca CRM
        </div>
        <div className="text-xs text-neutral-500">{tenantNombre}</div>
      </div>

      {navItems.map((item) => {
        const activo = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 text-sm",
              activo
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="mt-auto px-4 pt-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-left text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
