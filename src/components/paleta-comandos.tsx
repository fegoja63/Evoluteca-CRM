"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch, IconBuilding, IconUsers, IconChartFunnel, IconFileText, IconCalendar,
  IconBuildingPlus, IconUserPlus, IconCalendarPlus, IconFilePlus, IconPlus, IconSparkles,
  IconLayoutDashboard, IconReportAnalytics, IconSettings, IconUserCircle, IconInbox, IconCornerDownLeft,
  type Icon,
} from "@tabler/icons-react";

/**
 * Paleta de comandos (Ctrl+K / ⌘K): busca en todo el CRM, crea registros,
 * le pregunta a la IA y navega. Se abre con el atajo o con el evento
 * `abrir-paleta` (lo dispara el buscador del menú lateral).
 */
export const EVENTO_ABRIR_PALETA = "abrir-paleta";
export function abrirPaleta() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PALETA));
}

type Resultado = { tipo: "cliente" | "contacto" | "oportunidad" | "cotizacion" | "actividad"; id: string; titulo: string; sub: string; href: string };
type Item = { id: string; grupo: string; titulo: string; sub?: string; icon: Icon; href: string };

const TIPO_ICON: Record<Resultado["tipo"], Icon> = {
  cliente: IconBuilding, contacto: IconUsers, oportunidad: IconChartFunnel, cotizacion: IconFileText, actividad: IconCalendar,
};

// Crear: cada uno abre el formulario que ya existe en su pantalla.
const CREAR: Omit<Item, "grupo">[] = [
  { id: "c-cliente",     titulo: "Nuevo cliente",      icon: IconBuildingPlus, href: "/dashboard/cuentas?nuevo=1" },
  { id: "c-oportunidad", titulo: "Nueva oportunidad",  icon: IconPlus,         href: "/dashboard/pipeline?nueva=1" },
  { id: "c-actividad",   titulo: "Nueva actividad",    icon: IconCalendarPlus, href: "/dashboard/agenda?nueva=1" },
  { id: "c-cotizacion",  titulo: "Nueva cotización",   icon: IconFilePlus,     href: "/dashboard/cotizaciones-formales/nueva" },
  { id: "c-contacto",    titulo: "Nuevo contacto",     icon: IconUserPlus,     href: "/dashboard/contactos?nuevo=1" },
];

const IR: Omit<Item, "grupo">[] = [
  { id: "i-inicio",    titulo: "Inicio",         icon: IconLayoutDashboard, href: "/dashboard" },
  { id: "i-hoy",       titulo: "Bandeja Hoy",    icon: IconInbox,           href: "/dashboard/hoy" },
  { id: "i-agenda",    titulo: "Agenda",         icon: IconCalendar,        href: "/dashboard/agenda" },
  { id: "i-pipeline",  titulo: "Pipeline",       icon: IconChartFunnel,     href: "/dashboard/pipeline" },
  { id: "i-clientes",  titulo: "Clientes",       icon: IconBuilding,        href: "/dashboard/cuentas" },
  { id: "i-contactos", titulo: "Contactos",      icon: IconUsers,           href: "/dashboard/contactos" },
  { id: "i-cotiz",     titulo: "Cotizaciones",   icon: IconFileText,        href: "/dashboard/cotizaciones-formales" },
  { id: "i-reportes",  titulo: "Reportes",       icon: IconReportAnalytics, href: "/dashboard/reportes" },
  { id: "i-ia",        titulo: "Asistente IA",   icon: IconSparkles,        href: "/dashboard/asistente-ia" },
  { id: "i-config",    titulo: "Configuración",  icon: IconSettings,        href: "/dashboard/configuracion" },
  { id: "i-perfil",    titulo: "Mi perfil",      icon: IconUserCircle,      href: "/dashboard/perfil" },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function PaletaComandos() {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  // Atajo global y evento del menú lateral.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierta(a => !a);
      }
    };
    const onAbrir = () => setAbierta(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(EVENTO_ABRIR_PALETA, onAbrir);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENTO_ABRIR_PALETA, onAbrir);
    };
  }, []);

  useEffect(() => {
    if (abierta) {
      setQ(""); setResultados([]); setActivo(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [abierta]);

  // Búsqueda en el CRM (misma API que el buscador de siempre), con espera corta.
  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 2) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(texto)}`);
        const data = await res.json();
        setResultados(Array.isArray(data) ? data : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    const texto = q.trim();
    const filtro = (i: Omit<Item, "grupo">) => !texto || sinTildes(i.titulo).includes(sinTildes(texto));
    const encontrados: Item[] = resultados.map(r => ({ id: `r-${r.tipo}-${r.id}`, grupo: "Resultados", titulo: r.titulo, sub: r.sub, icon: TIPO_ICON[r.tipo], href: r.href }));
    const comandos: Item[] = [
      ...CREAR.filter(filtro).map(c => ({ ...c, grupo: "Crear" })),
      ...IR.filter(filtro).map(i => ({ ...i, grupo: "Ir a" })),
    ];
    // La IA va al final: si lo escrito coincide con un comando ("nuevo cli"),
    // Enter debe crear, no gastar una consulta de IA.
    const ia: Item[] = texto.length >= 3
      ? [{ id: "ia", grupo: "Inteligencia artificial", titulo: `Preguntar a la IA: «${texto}»`, sub: "Responde con los datos de tu CRM", icon: IconSparkles, href: `/dashboard/preguntar?q=${encodeURIComponent(texto)}` }]
      : [];
    return [...comandos, ...encontrados, ...ia];
  }, [q, resultados]);

  useEffect(() => { setActivo(0); }, [q, resultados]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  function elegir(item: Item | undefined) {
    if (!item) return;
    setAbierta(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActivo(a => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); elegir(items[activo]); }
    else if (e.key === "Escape") { e.preventDefault(); setAbierta(false); }
  }

  if (!abierta) return null;

  let grupoAnterior = "";
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh] animate-fade-in"
      onClick={() => setAbierta(false)}>
      <div role="dialog" aria-modal="true" aria-label="Buscar o crear"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-modal-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-4">
          <IconSearch size={18} stroke={1.75} className="shrink-0 text-slate-400" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Busca un cliente, crea algo o pregúntale a la IA…"
            role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-activedescendant={items[activo]?.id}
            className="w-full bg-transparent py-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none" />
          {buscando && <span className="text-xs text-slate-400">Buscando…</span>}
          <kbd className="rounded border border-slate-200 px-1.5 font-sans text-2xs text-slate-400">Esc</kbd>
        </div>
        <div ref={listaRef} id="paleta-lista" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados para «{q}»</p>
          )}
          {items.map((it, i) => {
            const cabecera = it.grupo !== grupoAnterior ? it.grupo : null;
            grupoAnterior = it.grupo;
            const Icono = it.icon;
            return (
              <div key={it.id}>
                {cabecera && <p className="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-slate-400">{cabecera}</p>}
                <button type="button" id={it.id} role="option" aria-selected={i === activo} data-indice={i}
                  onMouseMove={() => setActivo(i)} onClick={() => elegir(it)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${i === activo ? "bg-brand-50" : ""}`}>
                  <Icono size={17} stroke={1.75} className={`shrink-0 ${it.grupo === "Inteligencia artificial" ? "text-brand-600" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{it.titulo}</span>
                    {it.sub && <span className="block truncate text-xs text-slate-400">{it.sub}</span>}
                  </span>
                  {i === activo && <IconCornerDownLeft size={14} stroke={1.75} className="shrink-0 text-slate-400" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 text-2xs text-slate-400">
          <span><kbd className="font-sans">↑↓</kbd> moverse</span>
          <span><kbd className="font-sans">Enter</kbd> abrir</span>
          <span><kbd className="font-sans">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
}
