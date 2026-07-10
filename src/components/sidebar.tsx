"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  IconLayoutDashboard, IconBuilding, IconUsers, IconChartFunnel, IconCalendar,
  IconFileText, IconFilePlus, IconPackage, IconTemplate, IconReportAnalytics,
  IconUsersGroup, IconTheater, IconTicket, IconScale, IconBuildingPavilion,
  IconDatabaseImport, IconTrash, IconRocket, IconLifebuoy, IconSettings,
  IconUserCircle, IconLogout, IconSearch, IconX, type Icon,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type Resultado = { tipo: "cliente" | "contacto" | "oportunidad" | "cotizacion" | "actividad"; id: string; titulo: string; sub: string; href: string };

const TIPO_ICON: Record<string, Icon> = { cliente: IconBuilding, contacto: IconUsers, oportunidad: IconChartFunnel, cotizacion: IconFileText, actividad: IconCalendar };

const navBase: { href: string; label: string; icon: Icon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/dashboard/cuentas", label: "Clientes", icon: IconBuilding },
  { href: "/dashboard/contactos", label: "Contactos", icon: IconUsers },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: IconChartFunnel },
  { href: "/dashboard/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", icon: IconFileText },
  { href: "/dashboard/cotizaciones-formales", label: "Nueva cotización", icon: IconFilePlus },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: IconPackage },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: IconTemplate },
  { href: "/dashboard/reportes", label: "Reportes", icon: IconReportAnalytics },
  { href: "/dashboard/equipo", label: "Equipo", icon: IconUsersGroup },
];

const navOpcionales: Record<string, { href: string; label: string; icon: Icon }> = {
  funciones: { href: "/dashboard/funciones", label: "Funciones", icon: IconTheater },
  audiencia: { href: "/dashboard/audiencia", label: "Audiencia", icon: IconTicket },
  expedientes: { href: "/dashboard/expedientes", label: "Expedientes", icon: IconScale },
  salones: { href: "/dashboard/salones", label: "Salones", icon: IconBuildingPavilion },
};

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

export function Sidebar({ tenantNombre, onClose }: { tenantNombre: string; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setMostrarResultados(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); setMostrarResultados(false); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(busqueda)}`);
      const data = await res.json();
      setResultados(data);
      setMostrarResultados(true);
      setBuscando(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos as Record<string, boolean>) ?? {}));
  }, []);

  const navItems: { href: string; label: string; icon: Icon }[] = [
    ...navBase,
    ...Object.entries(modulos)
      .filter(([, activo]) => activo)
      .map(([key]) => navOpcionales[key])
      .filter(Boolean),
    { href: "/dashboard/datos", label: "Datos", icon: IconDatabaseImport },
    { href: "/dashboard/papelera", label: "Papelera", icon: IconTrash },
    { href: "/dashboard/bienvenida", label: "Guía de inicio", icon: IconRocket },
    { href: "/dashboard/ayuda", label: "Ayuda / Soporte", icon: IconLifebuoy },
    { href: "/dashboard/configuracion", label: "Configuración", icon: IconSettings },
  ];

  const nombreUsuario = session?.user?.name ?? "";
  const rolUsuario = session?.user?.rol ? session.user.rol.charAt(0) + session.user.rol.slice(1).toLowerCase() : "";

  return (
    <nav className="flex h-screen w-56 flex-col bg-brand-950 text-white">
      <div className="px-5 py-6 border-b border-white/10 relative">
        <div className="flex items-center justify-center">
          <img src="/Logo Evoluteca.png" alt="Evoluteca" className="h-7 w-auto object-contain" />
        </div>
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-brand-300 hover:text-white text-xl leading-none">
            <IconX size={20} stroke={1.75} />
          </button>
        )}
        <div className="text-xs text-brand-300 mt-2 text-center font-medium">{tenantNombre}</div>
      </div>

      {/* Búsqueda global */}
      <div className="px-3 py-2 border-b border-white/10 relative" ref={searchRef}>
        <div className="relative">
          <IconSearch size={15} stroke={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onFocus={() => resultados.length > 0 && setMostrarResultados(true)}
            placeholder="Buscar..."
            className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder-brand-400 outline-none focus:border-brand-400"
          />
          {buscando && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-400 text-xs">...</span>}
          {!buscando && busqueda && (
            <button onClick={() => { setBusqueda(""); setResultados([]); setMostrarResultados(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-400 hover:text-white">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
        {mostrarResultados && resultados.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            {resultados.map(r => {
              const Icono = TIPO_ICON[r.tipo];
              return (
                <button key={r.id} onClick={() => { router.push(r.href); setBusqueda(""); setMostrarResultados(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0">
                  <Icono size={15} stroke={1.75} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{r.titulo}</p>
                    <p className="text-xs text-slate-400 truncate">{r.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {mostrarResultados && resultados.length === 0 && busqueda.length >= 2 && !buscando && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-white shadow-xl border border-slate-200 px-3 py-2">
            <p className="text-xs text-slate-400">Sin resultados para "{busqueda}"</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const activo = pathname === item.href ||
            (item.href !== "/dashboard" &&
             item.href !== "/dashboard/cotizaciones" &&
             pathname.startsWith(item.href)) ||
            (item.href === "/dashboard/cotizaciones" && (pathname === "/dashboard/cotizaciones" || (pathname.startsWith("/dashboard/cotizaciones") && !pathname.startsWith("/dashboard/cotizaciones-formales"))));
          const Icono = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activo
                  ? "bg-accent-600 text-white font-medium"
                  : "text-brand-200 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icono size={17} stroke={1.75} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-3 border-t border-white/10 flex flex-col gap-2">
        {nombreUsuario && (
          <Link href="/dashboard/perfil"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
              {iniciales(nombreUsuario)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{nombreUsuario}</p>
              <p className="text-xs text-brand-300 truncate">{rolUsuario}</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-brand-200 hover:bg-white/5 hover:text-white transition-colors"
        >
          <IconLogout size={17} stroke={1.75} />
          Cerrar sesión
        </button>
        <a
          href="https://www.felipegomezjaramillo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 pt-1"
        >
          <img src="/Logo FGJ.jpg" alt="Felipe Gómez Jaramillo" className="h-8 w-auto object-contain rounded-md opacity-70" />
        </a>
      </div>
    </nav>
  );
}
