"use client";

import { SelectorTema } from "@/components/selector-tema";
import { abrirPaleta } from "@/components/paleta-comandos";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  IconLayoutDashboard, IconBuilding, IconUsers, IconChartFunnel, IconCalendar,
  IconFileText, IconPackage, IconTemplate, IconMailFast, IconReportAnalytics,
  IconUsersGroup, IconTheater, IconTicket, IconScale, IconBuildingPavilion, IconMessageChatbot,
  IconDatabaseImport, IconTrash, IconRocket, IconLifebuoy, IconSettings, IconHistory,
  IconUserCircle, IconLogout, IconSearch, IconX, IconArrowsSort, IconCheck,
  IconGripVertical, IconArrowBackUp, IconSparkles, IconHeartHandshake, IconChevronDown, IconChevronRight, IconInbox, IconCoin,
  IconSun, IconApps, IconDots, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, type Icon,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { INICIO_FINANZAS } from "@/lib/cuenta-finanzas";

type NavItem = { href: string; label: string; icon: Icon };

const navBase: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/dashboard/hoy", label: "Bandeja Hoy", icon: IconInbox },
  { href: "/dashboard/cuentas", label: "Clientes", icon: IconBuilding },
  { href: "/dashboard/contactos", label: "Contactos", icon: IconUsers },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: IconChartFunnel },
  { href: "/dashboard/agenda", label: "Agenda", icon: IconCalendar },
  { href: "/dashboard/cotizaciones-formales", label: "Cotizaciones", icon: IconFileText },
  { href: "/dashboard/catalogo", label: "Catálogo", icon: IconPackage },
  { href: "/dashboard/plantillas", label: "Plantillas", icon: IconTemplate },
  { href: "/dashboard/secuencias", label: "Secuencias", icon: IconMailFast },
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
type GrupoId = "finanzas" | "hoy" | "ventas" | "relaciones" | "analisis" | "modulos" | "mas";

// El Gerente Financiero: en una cuenta con CRM va entre los módulos; en una
// cuenta solo Finanzas es todo el menú (ver lib/cuenta-finanzas).
const ITEM_FINANZAS: NavItem = { href: INICIO_FINANZAS, label: "Gerente Financiero", icon: IconCoin };

const GRUPOS: { id: GrupoId; label: string }[] = [
  { id: "finanzas", label: "Finanzas" },
  { id: "hoy", label: "Hoy" },
  { id: "ventas", label: "Ventas" },
  { id: "relaciones", label: "Relaciones" },
  { id: "analisis", label: "Análisis" },
  { id: "modulos", label: "Módulos" },
  { id: "mas", label: "Más" },
];

const GRUPO_DE_HREF: Record<string, GrupoId> = {
  "/dashboard": "hoy",
  "/dashboard/hoy": "hoy",
  "/dashboard/agenda": "hoy",
  "/dashboard/pipeline": "ventas",
  "/dashboard/cotizaciones-formales": "ventas",
  "/dashboard/catalogo": "ventas",
  "/dashboard/plantillas": "ventas",
  "/dashboard/secuencias": "ventas",
  "/dashboard/cuentas": "relaciones",
  "/dashboard/contactos": "relaciones",
  "/dashboard/reportes": "analisis",
  "/dashboard/asistente-ia": "analisis",
  "/dashboard/equipo": "analisis",
  [INICIO_FINANZAS]: "modulos",
};

const HREFS_OPCIONALES = new Set(Object.values(navOpcionales).map(i => i.href));

function grupoDe(href: string): GrupoId {
  return GRUPO_DE_HREF[href] ?? (HREFS_OPCIONALES.has(href) ? "modulos" : "mas");
}

// Ícono de cada grupo en el menú compacto.
const ICONO_GRUPO: Record<GrupoId, Icon> = {
  finanzas: IconCoin, hoy: IconSun, ventas: IconChartFunnel, relaciones: IconUsers,
  analisis: IconReportAnalytics, modulos: IconApps, mas: IconDots,
};

// Menú compacto: solo los grupos, y cada uno despliega sus opciones al pasar
// el cursor (o al tocarlo en pantallas táctiles). Es una preferencia de cada
// usuario en su navegador; en el celular no aplica (allá va la barra inferior).
const CLAVE_COMPACTO = "evoluteca:menu-compacto";

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

type PropsSidebar = {
  tenantNombre: string;
  onClose?: () => void;
  /** Cuenta que compró solo el Gerente Financiero: el menú se reduce a eso. */
  soloFinanzas?: boolean;
  /** La cuenta tiene (o tuvo) licencia del Gerente Financiero: aparece en Módulos. */
  conFinanzas?: boolean;
};

export function Sidebar({ tenantNombre, onClose, soloFinanzas = false, conFinanzas = false }: PropsSidebar) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [ordenGuardado, setOrdenGuardado] = useState<string[] | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const [draggingHref, setDraggingHref] = useState<string | null>(null);
  const [dragOverHref, setDragOverHref] = useState<string | null>(null);
  const [plegados, setPlegados] = useState<Partial<Record<GrupoId, boolean>>>(PLEGADOS_DEFECTO);
  const [atajo, setAtajo] = useState("Ctrl K");
  // El cajón del celular (onClose) siempre va completo.
  const [compactoGuardado, setCompactoGuardado] = useState(false);
  const compacto = compactoGuardado && !onClose;
  const [flotante, setFlotante] = useState<{ grupo: GrupoId; top: number } | null>(null);
  const cierreRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_PLEGADOS);
      if (guardado) setPlegados(JSON.parse(guardado));
      setCompactoGuardado(window.localStorage.getItem(CLAVE_COMPACTO) === "1");
    } catch { /* sin almacenamiento: se usan los valores por defecto */ }
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setAtajo("⌘K");
  }, []);

  function cambiarCompacto(valor: boolean) {
    setCompactoGuardado(valor);
    setFlotante(null);
    setReordenando(false);
    try { window.localStorage.setItem(CLAVE_COMPACTO, valor ? "1" : "0"); } catch { /* ignorar */ }
  }

  // Al navegar se cierra el menú desplegado.
  useEffect(() => { setFlotante(null); }, [pathname]);

  // Escape o un clic fuera cierran el menú desplegado (pantallas táctiles).
  useEffect(() => {
    if (!flotante) return;
    const alTeclado = (e: KeyboardEvent) => { if (e.key === "Escape") setFlotante(null); };
    const alClic = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-menu-compacto]")) setFlotante(null);
    };
    window.addEventListener("keydown", alTeclado);
    window.addEventListener("mousedown", alClic);
    return () => { window.removeEventListener("keydown", alTeclado); window.removeEventListener("mousedown", alClic); };
  }, [flotante]);

  function abrirFlotante(grupo: GrupoId, boton: HTMLElement) {
    if (cierreRef.current) clearTimeout(cierreRef.current);
    setFlotante({ grupo, top: boton.getBoundingClientRect().top });
  }
  function cerrarFlotante() {
    if (cierreRef.current) clearTimeout(cierreRef.current);
    cierreRef.current = setTimeout(() => setFlotante(null), 180);
  }

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

  const navItemsBase: NavItem[] = soloFinanzas ? [
    ITEM_FINANZAS,
    { href: "/dashboard/equipo", label: "Equipo", icon: IconUsersGroup },
    { href: "/dashboard/ayuda", label: "Ayuda / Soporte", icon: IconLifebuoy },
    { href: "/dashboard/configuracion", label: "Configuración", icon: IconSettings },
  ] : [
    ...navBase,
    ...Object.entries(modulos)
      .filter(([, activo]) => activo)
      .map(([key]) => navOpcionales[key])
      .filter(Boolean),
    // Las finanzas de la empresa las ven el Administrador y el Gerente (lib/finanzas/acceso).
    ...(conFinanzas && session?.user?.rol !== "COMERCIAL" ? [ITEM_FINANZAS] : []),
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

  // El orden guardado es del menú del CRM: una cuenta solo Finanzas usa el suyo fijo.
  const navItems = soloFinanzas ? navItemsBase : aplicarOrden(navItemsBase, ordenGuardado);
  // En una cuenta solo Finanzas todo va en un único grupo.
  const grupoItem = (href: string): GrupoId => (soloFinanzas ? "finanzas" : grupoDe(href));
  const esActivo = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const grupos = GRUPOS
    .map(g => ({ ...g, items: navItems.filter(i => grupoItem(i.href) === g.id) }))
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
    if (!draggingHref || draggingHref === hrefDestino || grupoItem(draggingHref) !== grupoItem(hrefDestino)) {
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

  if (compacto) {
    const grupoAbierto = flotante ? grupos.find(g => g.id === flotante.grupo) : null;
    return (
      <nav data-menu-compacto className="flex h-screen w-[76px] flex-col items-center bg-brand-950 text-white">
        <Link href="/dashboard" title={tenantNombre} className="mt-4 mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white">
          <img src="/iconos/icono-96.png" alt="Evoluteca CRM" className="h-8 w-8" />
        </Link>
        {!soloFinanzas && (
          <button type="button" onClick={() => abrirPaleta()} title={"Buscar o crear (" + atajo + ")"}
            className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-brand-300 hover:bg-white/10 hover:text-white">
            <IconSearch size={19} stroke={1.75} />
          </button>
        )}
        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
          {grupos.map(g => {
            const Icono = ICONO_GRUPO[g.id];
            const tieneActivo = g.items.some(i => esActivo(i.href));
            const abierto = flotante?.grupo === g.id;
            return (
              <button key={g.id} type="button"
                onMouseEnter={e => abrirFlotante(g.id, e.currentTarget)}
                onMouseLeave={cerrarFlotante}
                onClick={e => (abierto ? setFlotante(null) : abrirFlotante(g.id, e.currentTarget))}
                aria-expanded={abierto}
                className={cn(
                  "relative flex w-16 flex-col items-center gap-0.5 rounded-xl py-2 transition-colors",
                  abierto ? "bg-white/10 text-white" : tieneActivo ? "text-white" : "text-brand-300 hover:bg-white/10 hover:text-white",
                )}>
                {tieneActivo && <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r bg-accent-500" />}
                <Icono size={21} stroke={1.75} />
                <span className="text-[11px] font-medium leading-tight">{g.label}</span>
              </button>
            );
          })}
        </div>

        {grupoAbierto && flotante && (
          <div
            onMouseEnter={() => { if (cierreRef.current) clearTimeout(cierreRef.current); }}
            onMouseLeave={cerrarFlotante}
            style={{ top: Math.max(8, Math.min(flotante.top - 8, window.innerHeight - 56 - grupoAbierto.items.length * 40)) }}
            className="fixed left-[82px] z-50 w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl">
            <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-wide text-slate-400">{grupoAbierto.label}</p>
            {grupoAbierto.items.map(item => {
              const Icono = item.icon;
              const activo = esActivo(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    activo ? "bg-accent-600 font-medium text-white" : "hover:bg-slate-100",
                  )}>
                  <Icono size={17} stroke={1.75} className={activo ? "text-white" : "text-slate-500"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center gap-1 border-t border-white/10 py-3">
          {nombreUsuario && (
            <Link href="/dashboard/perfil" title={nombreUsuario + " · Mi perfil"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
              {iniciales(nombreUsuario)}
            </Link>
          )}
          <button type="button" onClick={() => cambiarCompacto(false)} title="Expandir el menú"
            className="flex w-16 flex-col items-center gap-0.5 rounded-xl py-1.5 text-brand-300 hover:bg-white/10 hover:text-white">
            <IconLayoutSidebarLeftExpand size={19} stroke={1.75} />
            <span className="text-[11px] leading-tight">Expandir</span>
          </button>
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} title="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-300 hover:bg-white/10 hover:text-white">
            <IconLogout size={18} stroke={1.75} />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex h-screen w-56 flex-col bg-brand-950 text-white">
      <div className="px-5 py-6 border-b border-white/10 relative">
        <div className="flex items-center justify-center gap-2">
          <img src="/Logo Evoluteca.png" alt="Evoluteca" className="h-6 w-auto object-contain" />
          <span className="text-white font-bold text-base tracking-wide leading-none">{soloFinanzas ? "Finanzas" : "CRM"}</span>
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
          crea registros y le pregunta a la IA. Una cuenta solo Finanzas no
          la tiene (busca y crea registros del CRM). */}
      {!soloFinanzas && <div className="px-3 py-2 border-b border-white/10">
        <button type="button" onClick={() => { onClose?.(); abrirPaleta(); }}
          className="relative w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-12 py-1.5 text-left text-xs text-brand-400 hover:border-brand-400 transition-colors">
          <IconSearch size={15} stroke={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-400" />
          Buscar o crear…
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-white/15 px-1 font-sans text-2xs text-brand-400">
            {atajo}
          </kbd>
        </button>
      </div>}

      {/* Encabezado del menú + botón de reordenar */}
      <div className="px-3 pt-3 flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wide text-brand-400 px-1">Menú</span>
        {/* Una cuenta solo Finanzas tiene un menú fijo de pocos ítems. */}
        {!soloFinanzas && <div className="flex items-center gap-2">
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
          {!onClose && !reordenando && (
            <button onClick={() => cambiarCompacto(true)} title="Compactar el menú: solo los temas, y cada uno se despliega al pasar el cursor"
              className="rounded-md p-1 text-brand-300 transition-colors hover:bg-white/5 hover:text-white">
              <IconLayoutSidebarLeftCollapse size={15} stroke={1.75} />
            </button>
          )}
        </div>}
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
