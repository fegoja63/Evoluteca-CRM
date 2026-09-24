"use client";

// Tablero de Postventa (módulo opcional): los negocios GANADOS después de la
// venta — Entrega → Seguimiento → Renovación → Cerrado. Se arrastran entre
// columnas como en el Pipeline; cada tarjeta avisa cuándo toca renovar y, si la
// renovación está cerca o vencida, permite crear la oportunidad de renovación.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { IconHeartHandshake, IconRefresh, IconAlertTriangle, IconCalendarEvent, IconX } from "@tabler/icons-react";
import type { EtapaPostventa } from "@prisma/client";
import { ETAPAS_POSTVENTA, DIAS_AVISO_RENOVACION, estadoRenovacion, renovacionPendiente } from "@/lib/postventa";

type Negocio = {
  id: string;
  titulo: string;
  valor: string | null;
  postventaEtapa: EtapaPostventa;
  fechaRenovacion: string | null;
  fechaCierre: string | null;
  empresa: { id: string; nombre: string } | null;
  tieneRenovacion: boolean;
};

const fmtCOP = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

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
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [inactivo, setInactivo] = useState(false);
  const [soloRenovar, setSoloRenovar] = useState(false);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EtapaPostventa | null>(null);
  const [renovando, setRenovando] = useState<string | null>(null);

  async function cargar() {
    const res = await fetch("/api/postventa", { cache: "no-store" });
    if (res.status === 403) { setInactivo(true); setCargando(false); return; }
    setNegocios(res.ok ? await res.json() : []);
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

  const porRenovar = negocios.filter(n => renovacionPendiente(n));
  const visibles = soloRenovar ? porRenovar : negocios;
  const valorTotal = negocios.filter(n => n.postventaEtapa !== "CERRADO").reduce((a, n) => a + Number(n.valor ?? 0), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <IconHeartHandshake size={24} stroke={1.75} className="text-brand-600" />Postventa
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Lo que pasa después de ganar: entregar, acompañar y renovar. Arrastra las tarjetas entre columnas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800">{negocios.filter(n => n.postventaEtapa !== "CERRADO").length}</span> clientes activos · <span className="font-bold text-slate-800">{fmtCOP(valorTotal)}</span>
          </span>
          {(porRenovar.length > 0 || soloRenovar) && (
            <button onClick={() => setSoloRenovar(v => !v)}
              title={`Negocios con renovación vencida o en los próximos ${DIAS_AVISO_RENOVACION} días que aún no tienen su oportunidad de renovación`}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                soloRenovar ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}>
              {soloRenovar ? <IconX size={14} stroke={2} /> : <IconAlertTriangle size={14} stroke={2} />}
              {porRenovar.length} por renovar
            </button>
          )}
        </div>
      </div>

      {negocios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Aún no hay negocios en postventa</p>
          <p className="text-sm text-slate-500 mt-1">
            Cada negocio que ganes entra aquí solo. Para uno ganado antes de activar el módulo, ábrelo y usa &quot;Pasar a postventa&quot;.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ETAPAS_POSTVENTA.map(etapa => {
            const items = visibles.filter(n => n.postventaEtapa === etapa.key);
            const valor = items.reduce((a, n) => a + Number(n.valor ?? 0), 0);
            return (
              <div key={etapa.key}
                onDragOver={e => { e.preventDefault(); setSobre(etapa.key); }}
                onDragLeave={() => setSobre(s => (s === etapa.key ? null : s))}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("negocioId");
                  setSobre(null); setArrastrando(null);
                  const n = negocios.find(x => x.id === id);
                  if (n && n.postventaEtapa !== etapa.key) moverA(id, etapa.key);
                }}
                className={`rounded-2xl border p-3 min-h-[200px] transition-colors ${
                  sobre === etapa.key ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-slate-50"
                }`}>
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      <span className={`inline-block w-2 h-2 rounded-full ${etapa.dot}`} />{etapa.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{items.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{etapa.descripcion}</p>
                  {valor > 0 && <p className="text-xs font-semibold text-emerald-700 mt-1">{fmtCOP(valor)}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  {items.map(n => {
                    const badge = badgeRenovacion(n);
                    const pendiente = renovacionPendiente(n);
                    return (
                      <div key={n.id} draggable
                        onDragStart={e => { e.dataTransfer.setData("negocioId", n.id); e.dataTransfer.effectAllowed = "move"; setArrastrando(n.id); }}
                        onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                        className={`rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm cursor-grab active:cursor-grabbing ${
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
                        {pendiente && (
                          <button onClick={() => crearRenovacion(n)} disabled={renovando === n.id}
                            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                            <IconRefresh size={12} stroke={2} />{renovando === n.id ? "Creando…" : "Crear renovación"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="px-1 py-4 text-center text-[11px] text-slate-400">Sin negocios</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
