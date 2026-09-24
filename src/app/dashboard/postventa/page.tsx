"use client";

// Tablero de Postventa (módulo opcional): los negocios GANADOS después de la
// venta — Entrega → Seguimiento → Renovación → Cerrado. Misma estructura que el
// Pipeline (barra superior con filtro por vendedor, indicadores, búsqueda,
// vista Kanban/Tabla y columnas con borde de color), para que quien ya usa el
// Pipeline entienda Postventa sin aprenderla de cero.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "@/lib/toast";
import {
  IconHeartHandshake, IconRefresh, IconAlertTriangle, IconCalendarEvent, IconX, IconSearch,
  IconLayoutKanban, IconTable, IconSelector, IconArrowNarrowUp, IconArrowNarrowDown,
  IconCircleCheck, type Icon,
} from "@tabler/icons-react";
import type { EtapaPostventa } from "@prisma/client";
import { ETAPAS_POSTVENTA, DIAS_AVISO_RENOVACION, estadoRenovacion, renovacionPendiente } from "@/lib/postventa";

type Negocio = {
  id: string;
  titulo: string;
  valor: string | null;
  postventaEtapa: EtapaPostventa;
  fechaRenovacion: string | null;
  fechaCierre: string | null;
  creadoBy: string | null;
  empresa: { id: string; nombre: string } | null;
  tieneRenovacion: boolean;
};

type Columna = "titulo" | "empresa" | "etapa" | "valor" | "fechaRenovacion";

const fmtCOP = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
const ORDEN_ETAPA: Record<EtapaPostventa, number> = { ENTREGA: 0, SEGUIMIENTO: 1, RENOVACION: 2, CERRADO: 3 };

function badgeRenovacion(n: Negocio) {
  const e = estadoRenovacion(n.fechaRenovacion);
  if (!e || !n.fechaRenovacion) return null;
  if (n.tieneRenovacion) return { texto: "Renovación creada", clase: "bg-emerald-50 text-emerald-700" };
  if (e.tipo === "vencida") return { texto: `Renovación vencida hace ${e.dias}d`, clase: "bg-red-50 text-red-700" };
  if (e.tipo === "proxima") return { texto: e.dias === 0 ? "Renueva hoy" : `Renueva en ${e.dias}d`, clase: "bg-amber-50 text-amber-700" };
  return { texto: `Renueva ${fmtFecha(n.fechaRenovacion)}`, clase: "bg-slate-100 text-slate-600" };
}

export default function PostventaPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const esComercial = session?.user?.rol === "COMERCIAL";

  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [inactivo, setInactivo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [soloRenovar, setSoloRenovar] = useState(false);
  const [vista, setVista] = useState<"kanban" | "tabla">("kanban");
  const [orden, setOrden] = useState<{ col: Columna; dir: "asc" | "desc" }>({ col: "fechaRenovacion", dir: "asc" });
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EtapaPostventa | null>(null);
  const [renovando, setRenovando] = useState<string | null>(null);

  async function cargar() {
    const [res, resUsu] = await Promise.all([fetch("/api/postventa", { cache: "no-store" }), fetch("/api/usuarios")]);
    if (res.status === 403) { setInactivo(true); setCargando(false); return; }
    setNegocios(res.ok ? await res.json() : []);
    const usuarios = resUsu.ok ? await resUsu.json() : [];
    setVendedores(Array.isArray(usuarios) ? usuarios.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })) : []);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function moverA(id: string, etapa: EtapaPostventa) {
    const previo = negocios;
    setNegocios(ns => ns.map(n => (n.id === id ? { ...n, postventaEtapa: etapa } : n)));
    const res = await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postventaEtapa: etapa }),
    });
    if (!res.ok) {
      setNegocios(previo);
      toast.error("No se pudo mover el negocio. Inténtalo de nuevo.");
    }
  }

  async function crearRenovacion(n: Negocio) {
    setRenovando(n.id);
    const res = await fetch(`/api/oportunidades/${n.id}/renovacion`, { method: "POST" });
    setRenovando(null);
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.id) { router.push(`/dashboard/pipeline/${data.id}`); return; }
    if (!res.ok) { toast.error(data.error ?? "No se pudo crear la renovación"); return; }
    toast.success("Oportunidad de renovación creada en el pipeline");
    router.push(`/dashboard/pipeline/${data.id}`);
  }

  if (cargando) return <div className="h-64 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />;

  if (inactivo) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <IconHeartHandshake size={32} stroke={1.5} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-800">El módulo Postventa no está activo</p>
        <p className="text-sm text-slate-500 mt-1">Un Administrador puede activarlo en Configuración → Módulos.</p>
      </div>
    );
  }

  const nombreVendedor = (id: string | null) => vendedores.find(v => v.id === id)?.nombre ?? "—";

  // Los indicadores respetan el filtro de vendedor (la cartera que se mira),
  // no la búsqueda ni el chip.
  const delVendedor = negocios.filter(n => !filtroVendedor || n.creadoBy === filtroVendedor);
  const activos = delVendedor.filter(n => n.postventaEtapa !== "CERRADO");
  const porRenovar = delVendedor.filter(n => renovacionPendiente(n));
  const cerrados = delVendedor.filter(n => n.postventaEtapa === "CERRADO");
  const renovados = delVendedor.filter(n => n.tieneRenovacion);
  const suma = (xs: Negocio[]) => xs.reduce((a, n) => a + Number(n.valor ?? 0), 0);

  const q = busqueda.trim().toLowerCase();
  const filtrados = delVendedor.filter(n =>
    (!soloRenovar || renovacionPendiente(n)) &&
    (!q || n.titulo.toLowerCase().includes(q) || (n.empresa?.nombre ?? "").toLowerCase().includes(q))
  );
  const hayFiltro = !!(busqueda || filtroVendedor || soloRenovar);

  const valorOrden = (n: Negocio, col: Columna): string | number => {
    switch (col) {
      case "titulo": return n.titulo.toLowerCase();
      case "empresa": return (n.empresa?.nombre ?? "").toLowerCase();
      case "etapa": return ORDEN_ETAPA[n.postventaEtapa];
      case "valor": return Number(n.valor ?? 0);
      // Sin fecha de renovación van al final en orden ascendente.
      case "fechaRenovacion": return n.fechaRenovacion ? new Date(n.fechaRenovacion).getTime() : Number.MAX_SAFE_INTEGER;
    }
  };
  const tabla = [...filtrados].sort((a, b) => {
    const va = valorOrden(a, orden.col), vb = valorOrden(b, orden.col);
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return orden.dir === "asc" ? c : -c;
  });
  const ordenar = (col: Columna) => setOrden(o => ({ col, dir: o.col === col && o.dir === "asc" ? "desc" : "asc" }));
  const flecha = (col: Columna) => orden.col !== col
    ? <IconSelector size={12} className="inline text-slate-300" />
    : orden.dir === "asc" ? <IconArrowNarrowUp size={12} className="inline" /> : <IconArrowNarrowDown size={12} className="inline" />;

  const kpis: { label: string; valor: string; sub: string; icon: Icon; ibg: string; itxt: string }[] = [
    { label: "En postventa", valor: fmtCOP(suma(activos)), sub: `${activos.length} cliente${activos.length !== 1 ? "s" : ""} activo${activos.length !== 1 ? "s" : ""}`, icon: IconHeartHandshake, ibg: "bg-brand-50", itxt: "text-brand-600" },
    { label: `Por renovar (${DIAS_AVISO_RENOVACION} días)`, valor: String(porRenovar.length), sub: porRenovar.length ? `${fmtCOP(suma(porRenovar))} en juego` : "Nada pendiente", icon: IconAlertTriangle, ibg: "bg-amber-50", itxt: "text-amber-600" },
    { label: "Renovaciones creadas", valor: String(renovados.length), sub: "oportunidades en el pipeline", icon: IconRefresh, ibg: "bg-violet-50", itxt: "text-violet-600" },
    { label: "Cerrados", valor: String(cerrados.length), sub: cerrados.length ? fmtCOP(suma(cerrados)) : "ciclos terminados", icon: IconCircleCheck, ibg: "bg-emerald-50", itxt: "text-emerald-600" },
  ];

  return (
    <div>
      {/* ── HEADER: barra oscura como la del Pipeline ── */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 px-6 sm:px-8 py-4 mb-6 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <IconHeartHandshake size={24} stroke={1.75} className="text-brand-300" />Postventa
            </h1>
            <span className="hidden sm:block h-6 w-px bg-white/20" />
            <span className="text-brand-300 text-sm">Entregar, acompañar y renovar lo que ya ganaste</span>
          </div>
          {!esComercial && vendedores.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-2">
              <div>
                <p className="text-brand-300 text-xs mb-1">Vendedor</p>
                <select value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}
                  className="rounded-lg border border-white/30 bg-white text-slate-900 text-sm px-2 py-1.5 outline-none cursor-pointer">
                  <option value="">Todos</option>
                  {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── INDICADORES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(k => {
          const Icono = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.ibg}`}>
                <Icono size={18} stroke={1.75} className={k.itxt} />
              </div>
              <p className={`font-extrabold text-slate-900 leading-tight ${k.valor.length > 10 ? "text-lg" : "text-2xl"}`}>{k.valor}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{k.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── FILTROS + TOGGLE ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch size={14} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar negocio o cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-brand-500" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>

        {(porRenovar.length > 0 || soloRenovar) && (
          <button onClick={() => setSoloRenovar(v => !v)}
            title={`Negocios con renovación vencida o en los próximos ${DIAS_AVISO_RENOVACION} días que aún no tienen su oportunidad de renovación`}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              soloRenovar ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}>
            <IconAlertTriangle size={14} stroke={2} />{porRenovar.length} por renovar
          </button>
        )}

        {hayFiltro && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{filtrados.length} de {negocios.length}</span>
            <button onClick={() => { setBusqueda(""); setFiltroVendedor(""); setSoloRenovar(false); }}
              className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
              <IconX size={12} stroke={2} />Limpiar
            </button>
          </div>
        )}

        <div className="ml-auto flex rounded-xl border border-slate-200 overflow-hidden bg-white">
          <button onClick={() => setVista("kanban")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${vista === "kanban" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconLayoutKanban size={14} stroke={1.75} />Kanban
          </button>
          <button onClick={() => setVista("tabla")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${vista === "tabla" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconTable size={14} stroke={1.75} />Tabla
          </button>
        </div>
      </div>

      {negocios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Aún no hay negocios en postventa</p>
          <p className="text-sm text-slate-500 mt-1">
            Cada negocio que ganes entra aquí solo. Para uno ganado antes de activar el módulo, ábrelo y usa &quot;Pasar a postventa&quot;.
          </p>
        </div>
      ) : vista === "tabla" ? (
        /* ── VISTA TABLA ── */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("titulo")}>Negocio {flecha("titulo")}</th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("empresa")}>Cliente {flecha("empresa")}</th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("etapa")}>Etapa {flecha("etapa")}</th>
                  <th className="px-4 py-3 text-right font-semibold cursor-pointer select-none" onClick={() => ordenar("valor")}>Valor {flecha("valor")}</th>
                  <th className="px-4 py-3 text-left font-semibold cursor-pointer select-none" onClick={() => ordenar("fechaRenovacion")}>Renovación {flecha("fechaRenovacion")}</th>
                  {!esComercial && <th className="px-4 py-3 text-left font-semibold">Vendedor</th>}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tabla.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Sin negocios con estos filtros</td></tr>
                )}
                {tabla.map(n => {
                  const etapa = ETAPAS_POSTVENTA.find(e => e.key === n.postventaEtapa)!;
                  const badge = badgeRenovacion(n);
                  const pendiente = renovacionPendiente(n);
                  return (
                    <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/pipeline/${n.id}`} className="font-medium text-slate-900 hover:text-brand-600">{n.titulo}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{n.empresa?.nombre ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3"><span className={`text-xs rounded-full px-2 py-0.5 font-medium ${etapa.badge}`}>{etapa.label}</span></td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{n.valor && Number(n.valor) > 0 ? fmtCOP(Number(n.valor)) : "—"}</td>
                      <td className="px-4 py-3">
                        {badge ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.clase}`}>{badge.texto}</span>
                          : <span className="text-xs text-slate-400">Sin fecha</span>}
                      </td>
                      {!esComercial && <td className="px-4 py-3 text-slate-600">{nombreVendedor(n.creadoBy)}</td>}
                      <td className="px-4 py-3 text-right">
                        {pendiente && (
                          <button onClick={() => crearRenovacion(n)} disabled={renovando === n.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60 whitespace-nowrap">
                            <IconRefresh size={12} stroke={2} />{renovando === n.id ? "Creando…" : "Crear renovación"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">
            {tabla.length} negocio{tabla.length !== 1 ? "s" : ""}
          </div>
        </div>
      ) : (
        /* ── VISTA KANBAN ── */
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ETAPAS_POSTVENTA.map(etapa => {
            const items = filtrados.filter(n => n.postventaEtapa === etapa.key);
            const valor = items.reduce((a, n) => a + Number(n.valor ?? 0), 0);
            const isOver = sobre === etapa.key;
            return (
              <div key={etapa.key}
                onDragOver={e => { e.preventDefault(); setSobre(etapa.key); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null); }}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("negocioId");
                  setSobre(null); setArrastrando(null);
                  const n = negocios.find(x => x.id === id);
                  if (n && n.postventaEtapa !== etapa.key) moverA(id, etapa.key);
                }}
                className={`rounded-xl border-2 border-t-4 border-slate-200 ${etapa.borde} p-3 transition-colors ${
                  isOver ? "bg-brand-50 border-brand-300" : "bg-slate-50"
                }`}>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-700">{etapa.label}</h3>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${etapa.badge}`}>{items.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{etapa.descripcion}</p>
                  {valor > 0 && <p className="text-xs font-semibold text-emerald-700 mt-1">{fmtCOP(valor)}</p>}
                </div>

                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-0.5">
                  {items.length === 0 && (
                    <div className={`rounded-lg border-2 border-dashed py-6 text-center text-xs transition-colors ${
                      isOver ? "border-brand-300 text-brand-400 bg-brand-50" : "border-slate-200 text-slate-400"
                    }`}>
                      {isOver ? "Soltar aquí" : "Sin negocios"}
                    </div>
                  )}
                  {items.map(n => {
                    const badge = badgeRenovacion(n);
                    const pendiente = renovacionPendiente(n);
                    return (
                      <div key={n.id} draggable
                        onDragStart={e => { e.dataTransfer.setData("negocioId", n.id); e.dataTransfer.effectAllowed = "move"; setArrastrando(n.id); }}
                        onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                        className={`rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm cursor-grab active:cursor-grabbing select-none transition-opacity ${
                          arrastrando === n.id ? "opacity-40" : "hover:shadow-md"
                        } ${pendiente ? "border-l-4 border-l-amber-400" : ""}`}>
                        <Link href={`/dashboard/pipeline/${n.id}`}
                          onClick={e => { if (arrastrando) e.preventDefault(); }}
                          className="font-semibold text-slate-900 leading-snug hover:text-brand-600">
                          {n.titulo}
                        </Link>
                        {n.empresa && <p className="text-slate-500 mt-0.5">{n.empresa.nombre}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {n.valor && Number(n.valor) > 0 && <span className="font-semibold text-emerald-700">{fmtCOP(Number(n.valor))}</span>}
                          {badge ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${badge.clase}`}>
                              <IconCalendarEvent size={11} stroke={1.75} />{badge.texto}
                            </span>
                          ) : (
                            <span className="text-slate-400">Sin fecha de renovación</span>
                          )}
                        </div>
                        {!esComercial && !filtroVendedor && n.creadoBy && (
                          <p className="mt-1.5 text-[11px] text-slate-400">{nombreVendedor(n.creadoBy)}</p>
                        )}
                        {pendiente && (
                          <button onClick={() => crearRenovacion(n)} disabled={renovando === n.id}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                            <IconRefresh size={12} stroke={2} />{renovando === n.id ? "Creando…" : "Crear renovación"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
