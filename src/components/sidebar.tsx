"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Resultado = { tipo: "cliente" | "contacto" | "oportunidad" | "cotizacion" | "actividad"; id: string; titulo: string; sub: string; href: string };

const TIPO_ICON: Record<string, string> = { cliente: "🏢", contacto: "👤", oportunidad: "◈", cotizacion: "📋", actividad: "📅" };

const navBase = [
  { href: "/dashboard", label: "Dashboard", emoji: "▦" },
  { href: "/dashboard/cuentas", label: "Clientes", emoji: "🏢" },
  { href: "/dashboard/contactos", label: "Contactos", emoji: "👤" },
  { href: "/dashboard/pipeline", label: "Pipeline", emoji: "◈" },
  { href: "/dashboard/agenda", label: "Agenda", emoji: "📅" },
  { href: "/dashboard/cotizaciones", label: "Cotizaciones", emoji: "📄" },
  { href: "/dashboard/cotizaciones-formales", label: "Nueva cotización", emoji: "📋" },
  { href: "/dashboard/catalogo", label: "Catálogo", emoji: "📦" },
  { href: "/dashboard/reportes", label: "Reportes", emoji: "📊" },
  { href: "/dashboard/equipo", label: "Equipo", emoji: "👥" },
];

const navOpcionales: Record<string, { href: string; label: string; emoji: string }> = {
  funciones: { href: "/dashboard/funciones", label: "Funciones", emoji: "🎭" },
  audiencia: { href: "/dashboard/audiencia", label: "Audiencia", emoji: "🎪" },
  expedientes: { href: "/dashboard/expedientes", label: "Expedientes", emoji: "⚖️" },
};

export function Sidebar({ tenantNombre, onClose }: { tenantNombre: string; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
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

  const navItems = [
    ...navBase,
    ...Object.entries(modulos)
      .filter(([, activo]) => activo)
      .map(([key]) => navOpcionales[key])
      .filter(Boolean),
    { href: "/dashboard/datos", label: "Datos", emoji: "📥" },
    { href: "/dashboard/bienvenida", label: "Guía de inicio", emoji: "🚀" },
    { href: "/dashboard/ayuda", label: "Ayuda / Soporte", emoji: "🆘" },
    { href: "/dashboard/configuracion", label: "Configuración", emoji: "⚙️" },
  ];

  return (
    <nav className="flex h-screen w-56 flex-col bg-blue-950 text-white">
      <div className="px-5 py-6 border-b border-blue-900/50 relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img src="/Logo Evoluteca.png" alt="Evoluteca" className="h-8 w-auto object-contain" />
          <span className="text-white font-bold text-lg tracking-wide leading-none">CRM</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-blue-300 hover:text-white text-xl leading-none">×</button>
        )}
        <div className="text-xs text-blue-300 mt-1 text-center">{tenantNombre}</div>
        <a
          href="https://www.felipegomezjaramillo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-300 transition-colors text-center block mt-0.5"
        >
          felipegomezjaramillo.com
        </a>
      </div>

      {/* Búsqueda global */}
      <div className="px-3 py-2 border-b border-blue-900/50 relative" ref={searchRef}>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs">🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onFocus={() => resultados.length > 0 && setMostrarResultados(true)}
            placeholder="Buscar..."
            className="w-full rounded-lg bg-blue-900/50 border border-blue-800 pl-7 pr-3 py-1.5 text-xs text-white placeholder-blue-400 outline-none focus:border-blue-500"
          />
          {buscando && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs">...</span>}
          {!buscando && busqueda && (
            <button onClick={() => { setBusqueda(""); setResultados([]); setMostrarResultados(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white text-base leading-none">
              ×
            </button>
          )}
        </div>
        {mostrarResultados && resultados.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
            {resultados.map(r => (
              <button key={r.id} onClick={() => { router.push(r.href); setBusqueda(""); setMostrarResultados(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0">
                <span className="text-sm">{TIPO_ICON[r.tipo]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{r.titulo}</p>
                  <p className="text-xs text-slate-400 truncate">{r.sub}</p>
                </div>
              </button>
            ))}
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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                activo
                  ? "bg-blue-600 text-white font-medium"
                  : "text-blue-200 hover:bg-blue-900 hover:text-white"
              )}
            >
              <span className="text-base leading-none">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="px-3 py-4 border-t border-blue-900/50 flex flex-col gap-0.5">
        <Link href="/dashboard/perfil"
          className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/dashboard/perfil" ? "bg-blue-600 text-white font-medium" : "text-blue-200 hover:bg-blue-900 hover:text-white"
          )}>
          <span className="text-base leading-none">👤</span>
          Mi perfil
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-blue-900 hover:text-white transition-colors"
        >
          <span className="text-base leading-none">↩</span>
          Cerrar sesión
        </button>
        <div className="mt-3 flex items-center justify-center">
          <img src="/Logo FGJ.jpg" alt="Felipe Gómez Jaramillo" className="h-10 w-auto object-contain rounded-lg opacity-80" />
        </div>
      </div>
    </nav>
  );
}
