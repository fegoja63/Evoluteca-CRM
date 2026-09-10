"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconCalendarStats, IconPhone, IconUsers, IconMapPin, IconMail, IconFileText,
  IconTag, IconUserPlus, IconActivity, IconSnowflake, IconUserMinus, IconChecklist,
  IconChevronRight, type Icon,
} from "@tabler/icons-react";

type Datos = {
  actividad: {
    total: number;
    porTipo: Record<string, number>;
    propuestas: number;
    porVendedor: { nombre: string; total: number }[];
  };
  ticketPromedio: { valor: number; operaciones: number; ventana: "12m" | "historico" };
  clientes: { total: number; nuevos: number; activos: number; inactivos: number; perdidos: number };
};

function fmt(v: number) {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `$${Math.round(v / 1_000)}K`;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

// "Panel del Lunes" — la foto de cadencia semanal que un vendedor revisa al
// empezar la semana: cuánta actividad comercial hizo (7 días), cuánto vale una
// operación típica (ticket promedio) y cómo se mueve la cartera de clientes.
// Es una foto del AHORA, independiente de los filtros históricos de Reportes.
export function PanelLunes() {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/reportes/lunes", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setError(true));
  }, []);

  if (error) return null;
  if (!d) return <div className="mb-6 h-44 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />;

  // `filtro` es el valor que se le pasa a la Agenda por querystring (?tipo=…) al
  // hacer clic en la casilla. "VISITA" agrupa las dos visitas (comercial/técnica),
  // igual que en el conteo del API.
  const tiposActividad: { key: string; label: string; icon: Icon; color: string; filtro: string }[] = [
    { key: "LLAMADA", label: "Llamadas",  icon: IconPhone,    color: "text-blue-600",   filtro: "LLAMADA" },
    { key: "REUNION", label: "Reuniones", icon: IconUsers,    color: "text-violet-600", filtro: "REUNION" },
    { key: "VISITA",  label: "Visitas",   icon: IconMapPin,   color: "text-amber-600",  filtro: "VISITA" },
    { key: "EMAIL",   label: "Correos",   icon: IconMail,     color: "text-cyan-600",   filtro: "EMAIL" },
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <IconCalendarStats size={18} stroke={1.75} className="text-brand-600" />
        <span className="text-sm font-bold text-slate-800">El Lunes</span>
        <span className="text-[11px] text-slate-400">tu semana de un vistazo · foto de hoy</span>
        {/* Este panel es una foto del AHORA (7 días / 12 meses / este mes) y no
            reacciona a los filtros de Año/Mes/Vendedor de arriba. Se avisa para
            que cambiar el año no genere la falsa expectativa de que debería cambiar. */}
        <span className="text-[10px] font-medium rounded-full bg-slate-100 text-slate-500 px-2 py-0.5">
          independiente de los filtros de arriba
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">

        {/* ── 3. Actividad comercial (últimos 7 días) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Actividad comercial</p>
              <p className="text-xs text-slate-400 mt-0.5">Toques del equipo · últimos 7 días</p>
            </div>
            <span className="text-2xl font-extrabold text-brand-600">{d.actividad.total}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {tiposActividad.map(t => {
              const Icono = t.icon;
              return (
                <Link key={t.key} href={`/dashboard/agenda?tipo=${t.filtro}`}
                  title={`Ver las actividades de tipo ${t.label.toLowerCase()} en la Agenda`}
                  className="group flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 hover:border-brand-200 hover:bg-brand-50 transition-colors">
                  <Icono size={16} stroke={1.75} className={t.color} />
                  <span className="text-lg font-bold text-slate-800 leading-none">{d.actividad.porTipo[t.key] ?? 0}</span>
                  <span className="text-xs text-slate-400 group-hover:text-brand-600">{t.label}</span>
                  <IconChevronRight size={13} stroke={2} className="ml-auto text-slate-300 group-hover:text-brand-400" />
                </Link>
              );
            })}
          </div>
          {/* Fila Tareas + Propuestas: las Tareas antes no tenían casilla, así que
              el total (que sí las cuenta) no cuadraba con la suma visible. */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link href="/dashboard/agenda?tipo=TAREA"
              title="Ver las tareas en la Agenda"
              className="group flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 hover:border-brand-200 hover:bg-brand-50 transition-colors">
              <IconChecklist size={16} stroke={1.75} className="text-slate-500" />
              <span className="text-lg font-bold text-slate-800 leading-none">{d.actividad.porTipo["TAREA"] ?? 0}</span>
              <span className="text-xs text-slate-400 group-hover:text-brand-600">Tareas</span>
              <IconChevronRight size={13} stroke={2} className="ml-auto text-slate-300 group-hover:text-brand-400" />
            </Link>
            <Link href="/dashboard/cotizaciones"
              title="Ver las cotizaciones"
              className="group flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 hover:border-emerald-300 hover:bg-emerald-100 transition-colors">
              <IconFileText size={16} stroke={1.75} className="text-emerald-600" />
              <span className="text-lg font-bold text-emerald-700 leading-none">{d.actividad.propuestas}</span>
              <span className="text-xs text-emerald-600">propuestas</span>
              <IconChevronRight size={13} stroke={2} className="ml-auto text-emerald-300 group-hover:text-emerald-500" />
            </Link>
          </div>
          {d.actividad.porVendedor.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Por vendedor</p>
              <div className="flex flex-col gap-1.5">
                {d.actividad.porVendedor.map(v => {
                  const max = d.actividad.porVendedor[0].total || 1;
                  const pct = (v.total / max) * 100;
                  return (
                    <div key={v.nombre} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-24 truncate shrink-0">{v.nombre.split(" ").slice(0, 2).join(" ")}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full bg-brand-400" style={{ width: `${Math.max(pct, 4)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-6 text-right shrink-0">{v.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {d.actividad.total === 0 && (
            <p className="text-xs text-amber-600 mt-3">Sin actividad registrada esta semana — el pipeline no se mueve solo.</p>
          )}
        </div>

        {/* ── 5. Ticket promedio ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-slate-900">Ticket promedio</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Valor medio por operación ganada · {d.ticketPromedio.ventana === "12m" ? "últimos 12 meses" : "histórico"}
              </p>
            </div>
            <IconTag size={18} stroke={1.75} className="text-accent-600" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            <p className="text-4xl font-extrabold text-accent-600">{fmt(d.ticketPromedio.valor)}</p>
            <p className="text-xs text-slate-400 mt-2">
              {d.ticketPromedio.operaciones > 0
                ? `promedio de ${d.ticketPromedio.operaciones} operación${d.ticketPromedio.operaciones !== 1 ? "es" : ""} ganada${d.ticketPromedio.operaciones !== 1 ? "s" : ""}`
                : "aún sin operaciones ganadas para promediar"}
            </p>
          </div>
        </div>

        {/* ── 7. Movimiento de clientes ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Movimiento de clientes</p>
              <p className="text-xs text-slate-400 mt-0.5">{d.clientes.total} clientes en total</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { label: "Nuevos",    sub: "este mes",          valor: d.clientes.nuevos,    icon: IconUserPlus,  bg: "bg-emerald-50 border-emerald-100", txt: "text-emerald-700", itxt: "text-emerald-600" },
              { label: "Activos",   sub: "negocio en curso",  valor: d.clientes.activos,   icon: IconActivity,  bg: "bg-blue-50 border-blue-100",       txt: "text-blue-700",    itxt: "text-blue-600" },
              { label: "Inactivos", sub: `+60 días quietos`,  valor: d.clientes.inactivos, icon: IconSnowflake, bg: "bg-amber-50 border-amber-100",     txt: "text-amber-700",   itxt: "text-amber-600" },
              { label: "Perdidos",  sub: "este mes",          valor: d.clientes.perdidos,  icon: IconUserMinus, bg: "bg-red-50 border-red-100",         txt: "text-red-700",     itxt: "text-red-500" },
            ] as { label: string; sub: string; valor: number; icon: Icon; bg: string; txt: string; itxt: string }[]).map(c => {
              const Icono = c.icon;
              return (
                <div key={c.label} className={`rounded-xl border p-3 ${c.bg}`}>
                  <div className="flex items-center justify-between">
                    <Icono size={16} stroke={1.75} className={c.itxt} />
                    <span className={`text-2xl font-extrabold ${c.txt}`}>{c.valor}</span>
                  </div>
                  <p className={`text-xs font-semibold mt-1 ${c.txt}`}>{c.label}</p>
                  <p className="text-[11px] text-slate-400">{c.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
