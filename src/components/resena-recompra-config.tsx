"use client";

import { useEffect, useState } from "react";
import { IconStar, IconRepeat } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import type { ConfigResenaRecompra } from "@/lib/resena-recompra";

// Configuración › Reseñas y recompra (solo administradores). Ver lib/resena-recompra.ts.
export function ResenaRecompraConfig() {
  const [c, setC] = useState<ConfigResenaRecompra | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/resena-recompra", { cache: "no-store" })
      .then(r => r.json()).then(setC).catch(() => {});
  }, []);
  if (!c) return null;

  const resena = (cambio: Partial<ConfigResenaRecompra["resena"]>) => setC({ ...c, resena: { ...c.resena, ...cambio } });
  const recompra = (cambio: Partial<ConfigResenaRecompra["recompra"]>) => setC({ ...c, recompra: { ...c.recompra, ...cambio } });

  async function guardar() {
    setGuardando(true);
    const res = await fetch("/api/configuracion/resena-recompra", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c),
    }).catch(() => null);
    setGuardando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { toast.error(d?.error ?? "No se pudo guardar."); return; }
    setC(d);
    toast.success("Reseñas y recompra guardadas.");
  }

  return (
    <div className={tarjeta("mt-6 p-5")}>
      <h2 className="text-sm font-semibold text-slate-700">Reseñas y recompra</h2>
      <p className="mb-4 mt-1 text-xs text-slate-400">
        Después de ganar un negocio, el CRM le deja al vendedor la tarea en su Bandeja Hoy con el mensaje listo (y el botón de WhatsApp
        si el contacto tiene celular). Puede usar <code className="rounded bg-slate-100 px-1">{"{{nombre}}"}</code>{" "}
        <code className="rounded bg-slate-100 px-1">{"{{empresa}}"}</code> <code className="rounded bg-slate-100 px-1">{"{{negocio}}"}</code>{" "}
        <code className="rounded bg-slate-100 px-1">{"{{vendedor}}"}</code> y, en la reseña, <code className="rounded bg-slate-100 px-1">{"{{enlace}}"}</code>.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={c.resena.activa} onChange={e => resena({ activa: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            <IconStar size={16} stroke={1.75} className="text-amber-500" />Pedir reseña
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <input type="number" min={1} max={365} value={c.resena.dias} onChange={e => resena({ dias: Number(e.target.value) || 1 })} className={campo("sm", "w-16 text-right")} />
            días después de ganar el negocio
          </label>
          <input value={c.resena.enlace} onChange={e => resena({ enlace: e.target.value })} placeholder="Enlace para dejar la reseña (ej. de Google)"
            className={campo("md", "mt-2 w-full")} aria-label="Enlace de reseñas" />
          <textarea rows={4} value={c.resena.mensaje} onChange={e => resena({ mensaje: e.target.value })} className={campo("md", "mt-2 w-full")} aria-label="Mensaje para pedir la reseña" />
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <input type="checkbox" checked={c.recompra.activa} onChange={e => recompra({ activa: e.target.checked })} className="h-4 w-4 accent-brand-700" />
            <IconRepeat size={16} stroke={1.75} className="text-brand-600" />Ofrecer recompra
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <input type="number" min={7} max={730} value={c.recompra.dias} onChange={e => recompra({ dias: Number(e.target.value) || 7 })} className={campo("sm", "w-16 text-right")} />
            días después de ganar el negocio
          </label>
          <p className="mt-2 text-2xs text-slate-400">Si el cliente ya tiene otro negocio en curso, no se crea la tarea.</p>
          <textarea rows={4} value={c.recompra.mensaje} onChange={e => recompra({ mensaje: e.target.value })} className={campo("md", "mt-2 w-full")} aria-label="Mensaje para ofrecer la recompra" />
        </div>
      </div>

      <button onClick={guardar} disabled={guardando} className={boton("primario", "md", "mt-4")}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
