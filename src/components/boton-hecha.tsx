"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";
import { toast } from "@/lib/toast";

/**
 * Marca una actividad como completada desde una lista de solo lectura (Inicio)
 * y refresca la página del servidor. No borra la actividad.
 */
export function BotonHecha({ id }: { id: string }) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);

  async function marcar() {
    setGuardando(true);
    try {
      const res = await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: true }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("No se pudo marcar como hecha. Revisa tu conexión e inténtalo de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <button type="button" onClick={marcar} disabled={guardando}
      title="Marcar como hecha (no la borra)"
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50">
      <IconCheck size={13} stroke={2} />{guardando ? "…" : "Hecha"}
    </button>
  );
}
