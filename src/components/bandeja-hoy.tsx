"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconPinned, IconPhone, IconMail, IconExternalLink, IconCheck, IconCalendarTime, IconBulb,
  IconBuilding, IconUser, IconChartFunnel, IconInbox,
} from "@tabler/icons-react";
import { tipoActividadDef } from "@/lib/tipos-actividad";
import { aInputDatetimeLocal } from "@/lib/fecha-bogota";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { EstadoVacio } from "@/components/ui/estados";

type Ref = { id: string; nombre: string; telefono: string | null; email: string | null } | null;

export type ItemBandeja = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  vencida: boolean;
  notas: string | null;
  responsable: string | null;
  empresa: Ref;
  contacto: Ref;
  oportunidad: { id: string; titulo: string; etapa: string; valor: number | null } | null;
  sugerencia: { titulo: string; razon: string | null };
};

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Cotización", NEGOCIACION: "Negociación",
};

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
const fmtValor = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

/** Mañana a la misma hora (o 9:00 si la actividad era de madrugada), en hora de Bogotá. */
function sugerirNuevaFecha(iso: string) {
  const d = new Date(iso);
  const manana = new Date(Math.max(Date.now(), d.getTime()) + 86_400_000);
  return aInputDatetimeLocal(manana);
}

/** Qué significa "Hacer" para cada tipo: llamar, escribir o abrir el negocio. */
function accionHacer(it: ItemBandeja): { label: string; href: string; externo: boolean; icon: typeof IconPhone } {
  const tel = it.contacto?.telefono ?? it.empresa?.telefono;
  const email = it.contacto?.email ?? it.empresa?.email;
  const ficha = it.oportunidad ? `/dashboard/pipeline/${it.oportunidad.id}`
    : it.empresa ? `/dashboard/cuentas/${it.empresa.id}`
    : it.contacto ? `/dashboard/contactos/${it.contacto.id}` : "/dashboard/agenda";
  if (it.tipo === "LLAMADA" && tel) return { label: `Llamar ${tel}`, href: `tel:${tel.replace(/\s+/g, "")}`, externo: true, icon: IconPhone };
  if (it.tipo === "EMAIL" && email) return { label: `Escribir a ${email}`, href: `mailto:${email}`, externo: true, icon: IconMail };
  return { label: it.oportunidad ? "Abrir el negocio" : "Abrir la ficha", href: ficha, externo: false, icon: IconExternalLink };
}

export function BandejaHoy({ itemsIniciales }: { itemsIniciales: ItemBandeja[] }) {
  const [items, setItems] = useState(itemsIniciales);
  const [selId, setSelId] = useState<string | null>(itemsIniciales[0]?.id ?? null);
  const [reprogramando, setReprogramando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [guardando, setGuardando] = useState(false);

  const sel = items.find(i => i.id === selId) ?? null;
  const vencidas = items.filter(i => i.vencida).length;

  function seleccionar(id: string) {
    setSelId(id);
    setReprogramando(false);
  }

  // Quita el ítem despachado y pasa al siguiente de la lista.
  function sacar(id: string) {
    const idx = items.findIndex(i => i.id === id);
    const resto = items.filter(i => i.id !== id);
    setItems(resto);
    setSelId(resto[Math.min(idx, resto.length - 1)]?.id ?? null);
    setReprogramando(false);
  }

  async function patch(id: string, body: object) {
    setGuardando(true);
    try {
      const res = await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function marcarHecha(it: ItemBandeja) {
    if (await patch(it.id, { completada: true })) {
      toast.success("Hecha. Siguiente.");
      sacar(it.id);
    }
  }

  async function reprogramar(it: ItemBandeja) {
    if (!nuevaFecha) return;
    if (!(await patch(it.id, { fecha: nuevaFecha }))) return;
    const [dia, hora] = nuevaFecha.split("T");
    // Más tarde hoy: se queda en la bandeja (ya no vencida). Otro día: sale.
    if (dia === aInputDatetimeLocal(new Date()).slice(0, 10)) {
      toast.success(`Reprogramada para hoy a las ${hora}.`);
      setItems(prev => prev.map(i => i.id === it.id ? { ...i, vencida: false, fecha: new Date(`${nuevaFecha}:00-05:00`).toISOString() } : i));
      setReprogramando(false);
    } else {
      toast.success(`Reprogramada para el ${dia.split("-").reverse().join("/")} a las ${hora}.`);
      sacar(it.id);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <IconInbox size={24} stroke={1.75} className="text-brand-600" />Bandeja Hoy
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {items.length === 0
            ? "Nada pendiente para hoy."
            : `${items.length} por despachar${vencidas ? ` · ${vencidas} vencida${vencidas !== 1 ? "s" : ""}` : ""}. Una por una: hazla, reprográmala o márcala como hecha.`}
        </p>
      </div>

      {items.length === 0 ? (
        <EstadoVacio icon={IconCheck} titulo="Bandeja vacía"
          descripcion="No te queda nada para hoy. Buen momento para darle el próximo paso a un negocio."
          accion={<Link href="/dashboard/pipeline?sinPaso=1" className={boton("primario", "md")}>Ver negocios sin próximo paso</Link>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Lista */}
          <div className={tarjeta("p-2 lg:col-span-2 max-h-[70vh] overflow-y-auto")} role="listbox" aria-label="Pendientes">
            {items.map(it => {
              const Icono = tipoActividadDef(it.tipo)?.icon ?? IconPinned;
              const activo = it.id === selId;
              return (
                <button key={it.id} type="button" role="option" aria-selected={activo} onClick={() => seleccionar(it.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    activo ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"
                  }`}>
                  <Icono size={17} stroke={1.75} className={`shrink-0 ${it.vencida ? "text-red-500" : "text-brand-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{it.titulo}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {it.oportunidad?.titulo ?? it.empresa?.nombre ?? it.contacto?.nombre ?? "Sin relacionar"}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-2xs font-semibold ${
                    it.vencida ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {it.vencida
                      ? `Vencida · ${new Date(it.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" })}`
                      : new Date(it.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detalle */}
          {sel && (() => {
            const def = tipoActividadDef(sel.tipo);
            const Icono = def?.icon ?? IconPinned;
            const hacer = accionHacer(sel);
            const IconoHacer = hacer.icon;
            return (
              <div className={tarjeta("p-5 lg:col-span-3 flex flex-col gap-4")}>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      <Icono size={12} stroke={1.75} />{def?.label ?? sel.tipo}
                    </span>
                    <span className={sel.vencida ? "font-semibold text-red-600" : "text-slate-500"}>
                      {sel.vencida ? "Vencida · " : ""}{fmtFecha(sel.fecha)}
                    </span>
                    {sel.responsable && <span className="text-slate-400">· {sel.responsable}</span>}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{sel.titulo}</h2>
                  {sel.notas && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{sel.notas}</p>}
                </div>

                {/* Con quién / sobre qué */}
                <div className="flex flex-col gap-1.5 text-sm">
                  {sel.oportunidad && (
                    <Link href={`/dashboard/pipeline/${sel.oportunidad.id}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-brand-700">
                      <IconChartFunnel size={15} stroke={1.75} className="text-slate-400" />
                      <span className="font-medium">{sel.oportunidad.titulo}</span>
                      <span className="text-xs text-slate-400">
                        {ETAPA_LABEL[sel.oportunidad.etapa] ?? sel.oportunidad.etapa}{sel.oportunidad.valor ? ` · ${fmtValor(sel.oportunidad.valor)}` : ""}
                      </span>
                    </Link>
                  )}
                  {sel.empresa && (
                    <Link href={`/dashboard/cuentas/${sel.empresa.id}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-brand-700">
                      <IconBuilding size={15} stroke={1.75} className="text-slate-400" />{sel.empresa.nombre}
                    </Link>
                  )}
                  {sel.contacto && (
                    <Link href={`/dashboard/contactos/${sel.contacto.id}`} className="inline-flex items-center gap-2 text-slate-700 hover:text-brand-700">
                      <IconUser size={15} stroke={1.75} className="text-slate-400" />{sel.contacto.nombre}
                      {(sel.contacto.telefono || sel.contacto.email) && (
                        <span className="text-xs text-slate-400">{[sel.contacto.telefono, sel.contacto.email].filter(Boolean).join(" · ")}</span>
                      )}
                    </Link>
                  )}
                </div>

                {/* Sugerencia: la misma regla del estado comercial que usa el Pipeline */}
                <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                    <IconBulb size={14} stroke={1.75} />Sugerencia
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{sel.sugerencia.titulo}</p>
                  {sel.sugerencia.razon && <p className="text-xs text-slate-500">{sel.sugerencia.razon}</p>}
                </div>

                {/* Acciones */}
                <div className="flex flex-wrap gap-2">
                  {hacer.externo ? (
                    <a href={hacer.href} className={boton("primario", "md")}><IconoHacer size={16} stroke={1.75} />{hacer.label}</a>
                  ) : (
                    <Link href={hacer.href} className={boton("primario", "md")}><IconoHacer size={16} stroke={1.75} />{hacer.label}</Link>
                  )}
                  <button type="button" disabled={guardando}
                    onClick={() => { setReprogramando(r => !r); setNuevaFecha(sugerirNuevaFecha(sel.fecha)); }}
                    className={boton("secundario", "md")}>
                    <IconCalendarTime size={16} stroke={1.75} />Reprogramar
                  </button>
                  <button type="button" disabled={guardando} onClick={() => marcarHecha(sel)} className={boton("marca", "md")}>
                    <IconCheck size={16} stroke={2} />Hecha
                  </button>
                </div>

                {reprogramando && (
                  <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3">
                    <label className="text-xs text-slate-500">
                      Nueva fecha y hora
                      <input type="datetime-local" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)}
                        className={campo("md", "mt-1 block")} />
                    </label>
                    <button type="button" disabled={guardando || !nuevaFecha} onClick={() => reprogramar(sel)} className={boton("marca", "md")}>
                      Guardar
                    </button>
                    <button type="button" onClick={() => setReprogramando(false)} className={boton("fantasma", "md")}>Cancelar</button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
