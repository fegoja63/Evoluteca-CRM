"use client";

import { SelectorTema } from "@/components/selector-tema";
import { abrirPaleta } from "@/components/paleta-comandos";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  IconLayoutDashboard, IconBuilding, IconUsers, IconChartFunnel, IconCalendar,
  IconFileText, IconPackage, IconTemplate, IconReportAnalytics,
  IconUsersGroup, IconTheater, IconTicket, IconScale, IconBuildingPavilion, IconMessageChatbot,
  IconDatabaseImport, IconTrash, IconRocket, IconLifebuoy, IconSettings, IconHistory,
  IconUserCircle, IconLogout, IconSearch, IconX, IconArrowsSort, IconCheck,
  IconGripVertical, IconArrowBackUp, IconSparkles, IconHeartHandshake, IconChevronDown, IconChevronRight, type Icon,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: Icon };

const navBase: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/dashboard/cuentas", label: "Clientes", icon: IconBuilding },
  { href: "/dashboard/contactos", label: "Contactos", icon: IconUsers },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: IconChartFunnel },
  { href: "/dashboard/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/dashboard/cotizaciones-formales", label: "Cotizaciones", icon: IconFileText },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: IconPackage },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: IconTemplate },
  { href: "/dashboard/reportes", label: "Reportes", icon: IconReportAnalytics },
  { href: "/dashboard/asistente-ia", label: "Asistente IA", icon: IconSparkles },
  { href: "/dashboard/equipo", label: "Equipo", icon: IconUsersGroup },
];

const navOpcionales: Record<string, NavItem> = {
  funciones: { href: "/dashboard/funciones", label: "Funciones", icon: IconTheater },
  audiencia: { href: "/dashboard/audiencia", label: "Audiencia", icon: IconTicket },
  expedientes: { href: "/dashboard/expedientes", label: "Expedientes", icon: IconScale },
  salones: { href: "/dashboard/salones", label: "Salones", icon: IconBuildingPavilion },
  objeciones: { href: "/dashboard/objeciones", label: "Objeciones", icon: IconMessageChatbot },
  postventa: { href: "/dashboard/postventa", label: "Postventa", icon: IconHeartHandshake },
};

// ── Grupos del menú ─────────────────────────────────────────────────────────
// El menú se agrupa según el día del comercial. Cada ítem cae en un grupo por
// su href; los módulos opcionales (Funciones, Salones…) van juntos en
// "Módulos" y lo administrativo (Datos, Papelera, Ayuda…) en "Más", que
// arranca plegado. "Ordenar" sigue funcionando, pero dentro de cada grupo.
type GrupoId = "hoy" | "ventas" | "relaciones" | "analisis" | "modulos" | "mas";

const GRUPOS: { id: GrupoId; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "ventas", label: "Ventas" },
  { id: "relaciones", label: "Relaciones" },
  { id: "analisis", label: "Análisis" },
  { id: "modulos", label: "Módulos" },
  { id: "mas", label: "Más" },
];

const GRUPO_DE_HREF: Record<string, GrupoId> = {
  "/dashboard": "hoy",
  "/dashboard/agenda": "hoy",
  "/dashboard/pipeline": "ventas",
  "/dashboard/cotizaciones-formales": "ventas",
  "/dashboard/catalogo": "ventas",
  "/dashboard/plantillas": "ventas",
  "/dashboard/cuentas": "relaciones",
  "/dashboard/contactos": "relaciones",
  "/dashboard/reportes": "analisis",
  "/dashboard/asistente-ia": "analisis",
  "/dashboard/equipo": "analisis",
};

const HREFS_OPCIONALES = new Set(Object.values(navOpcionales).map(i => i.href));

function grupoDe(href: string): GrupoId {
  return GRUPO_DE_HREF[href] ?? (HREFS_OPCIONALES.has(href) ? "modulos" : "mas");
}

// Qué grupos tiene plegados el usuario. Vive en este navegador: es una
// comodidad visual, no un dato del CRM.
const CLAVE_PLEGADOS = "evoluteca:menu-plegados";
const PLEGADOS_DEFECTO: Partial<Record<GrupoId, boolean>> = { mas: true };

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

/** Aplica el orden guardado del usuario: los hrefs conocidos van en ese orden,
 * cualquier ítem nuevo que el usuario no había visto (módulo recién activado,
 * página nueva) se agrega al final en su orden por defecto. */
function aplicarOrden(items: NavItem[], orden: string[] | null): NavItem[] {
  if (!orden || orden.length === 0) return items;
  const porHref = new Map(items.map(i => [i.href, i]));
  const ordenados: NavItem[] = [];
  for (const href of orden) {
    const item = porHref.get(href);
    if (item) { ordenados.push(item); porHref.delete(href); }
  }
  return [...ordenados, ...Array.from(porHref.values())];
}

export function Sidebar({ tenantNombre, onClose }: { tenantNombre: string; onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [ordenGuardado, setOrdenGuardado] = useState<string[] | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const [draggingHref, setDraggingHref] = useState<string | null>(null);
  const [dragOverHref, setDragOverHref] = useState<string | null>(null);
  const [plegados, setPlegados] = useState<Partial<Record<GrupoId, boolean>>>(PLEGADOS_DEFECTO);
  const [atajo, setAtajo] = useState("Ctrl K");

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_PLEGADOS);
      if (guardado) setPlegados(JSON.parse(guardado));
    } catch { /* sin almacenamiento: se usan los valores por defecto */ }
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setAtajo("⌘K");
  }, []);

  function alternarGrupo(id: GrupoId) {
    setPlegados(prev => {
      const siguiente = { ...prev, [id]: !prev[id] };
      try { window.localStorage.setItem(CLAVE_PLEGADOS, JSON.stringify(siguiente)); } catch { /* ignorar */ }
      return siguiente;
    });
  }

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos as Record<string, boolean>) ?? {}));
    fetch("/api/perfil/orden-menu")
      .then((res) => res.json())
      .then((data) => setOrdenGuardado(data.ordenMenu ?? null));
  }, []);

  const navItemsBase: NavItem[] = [
    ...navBase,
    ...Object.entries(modulos)
      .filter(([, activo]) => activo)
      .map(([key]) => navOpcionales[key])
      .filter(Boolean),
    { href: "/dashboard/datos", label: "Datos", icon: IconDatabaseImport },
    { href: "/dashboard/papelera", label: "Papelera", icon: IconTrash },
    // Solo para administradores: contiene la actividad de todo el equipo. La
    // ruta lo vuelve a comprobar en el servidor — esconder el enlace es
    // comodidad, no seguridad.
    ...(session?.user?.rol === "ADMINISTRADOR"
      ? [{ href: "/dashboard/auditoria", label: "Auditoría", icon: IconHistory }]
      : []),
    { href: "/dashboard/bienvenida", label: "Guía de inicio", icon: IconRocket },
    { href: "/dashboard/ayuda", label: "Ayuda / Soporte", icon: IconLifebuoy },
    { href: "/dashboard/configuracion", label: "Configuración", icon: IconSettings },
  ];

  const navItems = aplicarOrden(navItemsBase, ordenGuardado);
  const esActivo = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const grupos = GRUPOS
    .map(g => ({ ...g, items: navItems.filter(i => grupoDe(i.href) === g.id) }))
    .filter(g => g.items.length > 0);

  async function guardarOrden(nuevoOrden: string[] | null) {
    setOrdenGuardado(nuevoOrden);
    await fetch("/api/perfil/orden-menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordenMenu: nuevoOrden }),
    });
  }

  function onDrop(hrefDestino: string) {
    // Solo se reordena dentro del mismo grupo.
    if (!draggingHref || draggingHref === hrefDestino || grupoDe(draggingHref) !== grupoDe(hrefDestino)) {
      setDraggingHref(null); setDragOverHref(null); return;
    }
    const hrefs = navItems.map(i => i.href);
    const origenIdx = hrefs.indexOf(draggingHref);
    const destinoIdx = hrefs.indexOf(hrefDestino);
    hrefs.splice(origenIdx, 1);
    hrefs.splice(destinoIdx, 0, draggingHref);
    setDraggingHref(null);
    setDragOverHref(null);
    guardarOrden(hrefs);
  }

  const nombreUsuario = session?.user?.name ?? "";
  const rolUsuario = session?.user?.rol ? session.user.rol.charAt(0) + session.user.rol.slice(1).toLowerCase() : "";

  return (
    <nav className="flex h-screen w-56 flex-col bg-brand-950 text-white">
      <div className="px-5 py-6 border-b border-white/10 relative">
        <div className="flex items-center justify-center gap-2">
          <img src="/Logo Evoluteca.png" alt="Evoluteca" className="h-6 w-auto object-contain" />
          <span className="text-white font-bold text-base tracking-wide leading-none">CRM</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-brand-300 hover:text-white text-xl leading-none">
            <IconX size={20} stroke={1.75} />
          </button>
        )}
        <div className="text-xs text-brand-300 mt-2 text-center font-medium">{tenantNombre}</div>
        <a
          href="https://www.felipegomezjaramillo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:text-accent-400 transition-colors text-center block mt-0.5"
        >
          felipegomezjaramillo.com
        </a>
      </div>

      {/* Búsqueda global: abre la paleta de comandos (Ctrl+K / ⌘K), que busca,
          crea registros y le pregunta a la IA. */}
      <div className="px-3 py-2 border-b border-white/10">
        <button type="button" onClick={() => { onClose?.(); abrirPaleta(); }}
          className="relative w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-12 py-1.5 text-left text-xs text-brand-400 hover:border-brand-400 transition-colors">
          <IconSearch size={15} stroke={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-400" />
          Buscar o crear…
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/15 px-1 font-sans text-2xs text-brand-400">
            {atajo}
          </kbd>
        </button>
      </div>

      {/* Encabezado del menú + botón de reordenar */}
      <div className="px-3 pt-3 flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wide text-brand-400 px-1">Menú</span>
        <div className="flex items-center gap-2">
          {reordenando && ordenGuardado && (
            <button
              onClick={() => guardarOrden(null)}
              title="Restablecer al orden original"
              className="flex items-center gap-1 text-xs text-brand-300 hover:text-white transition-colors"
            >
              <IconArrowBackUp size={13} stroke={1.75} /> Restablecer
            </button>
          )}
          <button
            onClick={() => setReordenando(v => !v)}
            title={reordenando ? "Listo" : "Ordenar menú a tu gusto"}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors",
              reordenando ? "bg-accent-600 text-white" : "text-brand-300 hover:bg-white/5 hover:text-white"
            )}
          >
            {reordenando ? <IconCheck size={13} stroke={2} /> : <IconArrowsSort size={13} stroke={1.75} />}
            {reordenando ? "Listo" : "Ordenar"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-1 flex flex-col gap-0.5">
        {grupos.map(g => {
          const tieneActivo = g.items.some(i => esActivo(i.href));
          const abierto = reordenando || tieneActivo || !plegados[g.id];
          const plegable = !reordenando && !tieneActivo;
          return (
            <div key={g.id} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => plegable && alternarGrupo(g.id)}
                aria-expanded={abierto}
                className={cn(
                  "mt-2 flex items-center justify-between rounded-md px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-brand-400 transition-colors",
                  plegable ? "hover:text-brand-200" : "cursor-default"
                )}
              >
                <span>{g.label}</span>
                {plegable && (abierto
                  ? <IconChevronDown size={13} stroke={2} />
                  : <IconChevronRight size={13} stroke={2} />)}
              </button>
              {abierto && g.items.map((item) => {
                const activo = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icono = item.icon;
                const claseBase = cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  activo && !reordenando
                    ? "bg-accent-600 text-white font-medium"
                    : "text-brand-200 hover:bg-white/5 hover:text-white",
                  reordenando && dragOverHref === item.href && draggingHref !== item.href && "ring-1 ring-accent-400",
                  reordenando && draggingHref === item.href && "opacity-40"
                );

                if (reordenando) {
                  return (
                    <div
                      key={item.href}
                      draggable
                      onDragStart={() => setDraggingHref(item.href)}
                      onDragOver={e => { e.preventDefault(); setDragOverHref(item.href); }}
                      onDrop={() => onDrop(item.href)}
                      onDragEnd={() => { setDraggingHref(null); setDragOverHref(null); }}
                      className={cn(claseBase, "cursor-grab active:cursor-grabbing select-none")}
                    >
                      <IconGripVertical size={15} stroke={1.75} className="shrink-0 text-brand-400" />
                      <Icono size={16} stroke={1.75} className="shrink-0" />
                      {item.label}
                    </div>
                  );
                }

                return (
                  <Link key={item.href} href={item.href} className={claseBase}>
                    <Icono size={17} stroke={1.75} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
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
        <SelectorTema />
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
