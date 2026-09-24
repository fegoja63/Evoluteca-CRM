"use client";

// Panel de Postventa en la ficha de un negocio GANADO (módulo opcional):
// etapa de postventa, fecha de renovación y la oportunidad de renovación.
// Si el negocio aún no está en postventa (p. ej. se ganó antes de activar el
// módulo), ofrece "Pasar a postventa".

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { IconHeartHandshake, IconRefresh, IconCalendarEvent } from "@tabler/icons-react";
import type { EtapaPostventa } from "@prisma/client";
import { ETAPAS_POSTVENTA, DIAS_AVISO_RENOVACION, estadoRenovacion, renovacionPendiente } from "@/lib/postventa";

type Props = {
  op: {
    id: string;
    postventaEtapa: EtapaPostventa | null;
    fechaRenovacion: string | null;
    renovaciones?: { id: string; titulo: string; etapa: string }[];
  };
  onCambio: () => void | Promise<void>;
};

// "2026-10-15T05:00:00.000Z" → "2026-10-15" en hora de Bogotá, para el <input type="date">.
function aInputFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

export function PanelPostventa({ op, onCambio }: Props) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [fecha, setFecha] = useState(aInputFecha(op.fechaRenovacion));
  const renovacion = op.renovaciones?.[0] ?? null;

  async function patch(data: Record<string, unknown>, ok: string) {
    setGuardando(true);
    const res = await fetch(`/api/oportunidades/${op.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setGuardando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo guardar");
      return;
    }
    toast.success(ok);
    await onCambio();
  }

  async function crearRenovacion() {
    setGuardando(true);
    const res = await fetch(`/api/oportunidades/${op.id}/renovacion`, { method: "POST" });
    setGuardando(false);
    const d = await res.json().catch(() => ({}));
    if (res.status === 409 && d.id) { router.push(`/dashboard/pipeline/${d.id}`); return; }
    if (!res.ok) { toast.error(d.error ?? "No se pudo crear la renovación"); return; }
    toast.success("Oportunidad de renovación creada en el pipeline");
    router.push(`/dashboard/pipeline/${d.id}`);
  }

  // Aún no está en postventa: se ofrece pasarlo.
  if (!op.postventaEtapa) {
    return (
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <IconHeartHandshake size={18} stroke={1.75} className="text-brand-600" />
          Este negocio ganado no está en el tablero de Postventa.
        </div>
        <button onClick={() => patch({ postventaEtapa: "ENTREGA" }, "Negocio pasado a postventa")} disabled={guardando}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
          Pasar a postventa
        </button>
      </div>
    );
  }

  const estado = estadoRenovacion(op.fechaRenovacion);
  const pendiente = renovacionPendiente({ ...op, tieneRenovacion: !!renovacion });
  const fechaCambio = fecha !== aInputFecha(op.fechaRenovacion);

  return (
    <div className={`mb-5 rounded-xl border border-slate-200 bg-white p-4 ${pendiente ? "border-l-4 border-l-amber-400" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <IconHeartHandshake size={18} stroke={1.75} className="text-brand-600" />Postventa
        </h2>
        <Link href="/dashboard/postventa" className="text-xs text-brand-600 hover:underline">Ver tablero</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Etapa</p>
          <div className="flex flex-wrap gap-1.5">
            {ETAPAS_POSTVENTA.map(e => (
              <button key={e.key} disabled={guardando || e.key === op.postventaEtapa}
                onClick={() => patch({ postventaEtapa: e.key }, `Movido a ${e.label}`)}
                title={e.descripcion}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  e.key === op.postventaEtapa ? e.color : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Fecha de renovación</p>
          <div className="flex items-center gap-2">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={guardando}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500" />
            {fechaCambio && (
              <button onClick={() => patch({ fechaRenovacion: fecha || null }, fecha ? "Fecha de renovación guardada" : "Fecha de renovación quitada")}
                disabled={guardando}
                className="rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-60">
                Guardar
              </button>
            )}
          </div>
          {estado && !fechaCambio && (
            <p className={`mt-1.5 flex items-center gap-1 text-xs ${estado.tipo === "vencida" ? "text-red-600" : estado.tipo === "proxima" ? "text-amber-700" : "text-slate-500"}`}>
              <IconCalendarEvent size={12} stroke={1.75} />
              {estado.tipo === "vencida" ? `Vencida hace ${estado.dias} días`
                : estado.tipo === "proxima" ? (estado.dias === 0 ? "Renueva hoy" : `Renueva en ${estado.dias} días`)
                : `Faltan ${estado.dias} días · el aviso llega ${DIAS_AVISO_RENOVACION} días antes`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {renovacion ? (
          <p className="text-sm text-slate-600">
            Renovación: <Link href={`/dashboard/pipeline/${renovacion.id}`} className="font-semibold text-brand-600 hover:underline">{renovacion.titulo}</Link>
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              {pendiente ? "Se acerca la renovación: crea la oportunidad para negociarla." : "Cuando toque renovar, crea la oportunidad de renovación en el pipeline."}
            </p>
            <button onClick={crearRenovacion} disabled={guardando}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                pendiente ? "bg-amber-600 text-white hover:bg-amber-700" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}>
              <IconRefresh size={14} stroke={2} />Crear oportunidad de renovación
            </button>
          </>
        )}
      </div>
    </div>
  );
}
