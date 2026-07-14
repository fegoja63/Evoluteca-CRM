"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconFilePlus, IconSearch, IconX, IconDownload, IconAlertTriangle, IconFileText,
} from "@tabler/icons-react";
import { idsReemplazadas } from "@/lib/cotizaciones";

type Item = { id: string; descripcion: string; cantidad: number; precioUnit: string };
type Cotizacion = {
  id: string;
  numero: number;
  estado: string;
  fechaEvento: string | null;
  fechaValidez: string | null;
  sede: string | null;
  notas: string | null;
  creadoEn: string;
  empresa:  { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string; email: string | null } | null;
  oportunidad: { id: string; titulo: string } | null;
  items: Item[];
};

const ESTADO_COLOR: Record<string, string> = {
  BORRADOR:  "bg-slate-100 text-slate-600",
  ENVIADA:   "bg-brand-50 text-brand-700",
  ACEPTADA:  "bg-emerald-50 text-emerald-700",
  RECHAZADA: "bg-red-50 text-red-600",
};
const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada",
};

function total(items: Item[]) {
  return items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
}

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}

function validezBadge(fechaValidez: string | null, estado: string) {
  if (!fechaValidez || estado === "ACEPTADA" || estado === "RECHAZADA") return null;
  const ahora = Date.now();
  const fecha = new Date(fechaValidez).getTime();
  const dias = Math.ceil((fecha - ahora) / 86_400_000);
  if (dias < 0)  return { label: `Vencida ${Math.abs(dias)}d`, color: "bg-red-100 text-red-700" };
  if (dias === 0) return { label: "Vence hoy", color: "bg-red-100 text-red-700" };
  if (dias <= 7)  return { label: `Vence en ${dias}d`, color: "bg-amber-100 text-amber-700" };
  return null;
}

export default function CotizacionesFormalesPage() {
  const [lista, setLista] = useState<Cotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [exportando, setExportando] = useState(false);

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/cotizaciones-formales");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cotizaciones-formales-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/cotizaciones");
    setLista(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta cotización formal?")) return;
    await fetch(`/api/cotizaciones/${id}`, { method: "DELETE" });
    cargar();
  }

  // Cotizaciones reemplazadas por una versión más reciente del mismo negocio.
  // Se muestran atenuadas como historial y no cuentan como activas.
  const reemplazadas = idsReemplazadas(
    lista.map(c => ({ id: c.id, numero: c.numero, estado: c.estado, oportunidadId: c.oportunidad?.id ?? null }))
  );

  const listado = lista.filter(c => {
    if (filtroEstado !== "TODAS" && c.estado !== filtroEstado) return false;
    if (soloVencidas && validezBadge(c.fechaValidez, c.estado) === null) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const campos = [c.empresa?.nombre, c.contacto?.nombre, c.sede, String(c.numero)].filter(Boolean).map(v => v!.toLowerCase());
      if (!campos.some(v => v.includes(q))) return false;
    }
    return true;
  });

  const valorTotal = listado.reduce((acc, c) => acc + (reemplazadas.has(c.id) ? 0 : total(c.items)), 0);
  const conteos = { BORRADOR: 0, ENVIADA: 0, ACEPTADA: 0, RECHAZADA: 0 };
  lista.forEach(c => { if (!reemplazadas.has(c.id) && c.estado in conteos) conteos[c.estado as keyof typeof conteos]++; });
  const vencidas = lista.filter(c => !reemplazadas.has(c.id) && validezBadge(c.fechaValidez, c.estado) !== null);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones</h1>
          <p className="text-slate-500 text-sm mt-1">Cada cotización aparece como un negocio en el Pipeline</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <IconDownload size={16} stroke={1.75} />
            {exportando ? "Exportando..." : "Excel"}
          </button>
          <Link href="/dashboard/cotizaciones-formales/nueva"
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            <IconFilePlus size={16} stroke={1.75} />
            Nueva cotización
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Borradores",  key: "BORRADOR",  color: "bg-slate-500" },
          { label: "Enviadas",    key: "ENVIADA",   color: "bg-brand-500" },
          { label: "Aceptadas",   key: "ACEPTADA",  color: "bg-emerald-500" },
          { label: "Rechazadas",  key: "RECHAZADA", color: "bg-red-500" },
        ].map(k => (
          <button key={k.key} onClick={() => { setSoloVencidas(false); setFiltroEstado(filtroEstado === k.key ? "TODAS" : k.key); }}
            className={`rounded-2xl border p-4 text-left transition-all ${filtroEstado === k.key ? "border-brand-400 ring-2 ring-brand-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <div className={`w-2 h-2 rounded-full ${k.color} mb-2`} />
            <p className="text-2xl font-bold text-slate-900">{conteos[k.key as keyof typeof conteos]}</p>
            <p className="text-xs text-slate-500">{k.label}</p>
          </button>
        ))}
      </div>

      {/* Alerta vencidas */}
      {vencidas.length > 0 && (
        <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 px-5 py-3 flex items-center gap-3">
          <IconAlertTriangle size={18} stroke={1.75} className="text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {vencidas.length} cotización{vencidas.length !== 1 ? "es" : ""} vencida{vencidas.length !== 1 ? "s" : ""} o próxima{vencidas.length !== 1 ? "s" : ""} a vencer
            </p>
            <p className="text-xs text-red-600 mt-0.5">Revisa y actualiza la fecha de validez o cambia el estado.</p>
          </div>
          <button onClick={() => { setSoloVencidas(true); setFiltroEstado("TODAS"); setBusqueda(""); }} className="text-xs text-red-700 font-medium underline shrink-0">Ver vencidas</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:max-w-sm">
          <IconSearch size={15} stroke={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por cliente, N° cotización, sede..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-8 pr-8 py-2 text-sm outline-none focus:border-brand-500" />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
        {(busqueda || filtroEstado !== "TODAS" || soloVencidas) && (
          <button onClick={() => { setBusqueda(""); setFiltroEstado("TODAS"); setSoloVencidas(false); }}
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
            <IconX size={12} stroke={2.5} />
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : listado.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <IconFileText size={28} stroke={1.5} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-4">No hay cotizaciones formales aún.</p>
          <Link href="/dashboard/cotizaciones-formales/nueva"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
            <IconFilePlus size={16} stroke={1.75} />
            Nueva cotización
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-1 text-left">N°</th>
                <th className="px-4 py-1 text-left">Cliente</th>
                <th className="px-4 py-1 text-left">Evento / Sede</th>
                <th className="px-4 py-1 text-left">Fecha evento</th>
                <th className="px-4 py-1 text-left">Validez</th>
                <th className="px-4 py-1 text-right">Total</th>
                <th className="px-4 py-1 text-center">Estado</th>
                <th className="px-4 py-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listado.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors group ${reemplazadas.has(c.id) ? "opacity-55" : ""}`}>
                  <td className="px-4 py-1">
                    <Link href={`/dashboard/cotizaciones-formales/${c.id}`}>
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg">
                        #{String(c.numero).padStart(4, "0")}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-1">
                    <Link href={`/dashboard/cotizaciones-formales/${c.id}`} className="block">
                      <p className="font-medium text-slate-900 group-hover:text-brand-600">{c.empresa?.nombre ?? <span className="text-slate-400 italic text-xs">Sin cliente</span>}</p>
                      {c.contacto && <p className="text-xs text-slate-400">{c.contacto.nombre}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-600">
                    <Link href={`/dashboard/cotizaciones-formales/${c.id}`} className="block">
                      {c.oportunidad?.titulo && <p className="text-xs font-medium truncate max-w-[180px]">{c.oportunidad.titulo}</p>}
                      {c.sede && <p className="text-xs text-slate-400">{c.sede}</p>}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-500 text-xs whitespace-nowrap">
                    {c.fechaEvento ? new Date(c.fechaEvento).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-1 text-xs whitespace-nowrap">
                    {c.fechaValidez ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500">{new Date(c.fechaValidez).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}</span>
                        {(() => { const b = validezBadge(c.fechaValidez, c.estado); return b ? (
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold w-fit ${b.color}`}>{b.label}</span>
                        ) : null; })()}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-1 text-right font-bold text-slate-900 whitespace-nowrap">
                    {c.items.length > 0 ? fmt(total(c.items)) : <span className="text-slate-400 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-1 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_COLOR[c.estado]}`}>
                        {ESTADO_LABEL[c.estado]}
                      </span>
                      {reemplazadas.has(c.id) && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-500">
                          Reemplazada
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-1 text-right">
                    <button onClick={() => eliminar(c.id)}
                      className="text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td colSpan={5} className="px-4 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Total ({listado.length} cotizaciones)
                </td>
                <td className="px-4 py-1 text-right font-bold text-slate-900">{fmt(valorTotal)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}


