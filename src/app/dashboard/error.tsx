"use client";

import { useEffect } from "react";
import { reportarError } from "@/lib/error-report";
import { IconAlertTriangle } from "@tabler/icons-react";

// Boundary de errores del dashboard: atrapa un crash de render de cualquier
// página interna (sin tumbar el menú), lo reporta al monitoreo propio y deja
// reintentar. Es el que atrapa casos como el crash del detalle de cotización.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportarError({ mensaje: error?.message || "Error en el dashboard", stack: error?.stack, tipo: "boundary" });
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20 px-6">
      <div className="max-w-md text-center rounded-2xl border border-slate-200 bg-white p-8">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
          <IconAlertTriangle size={26} stroke={1.75} className="text-red-500" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-1">No se pudo mostrar esta sección</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Ocurrió un error inesperado en esta pantalla. Ya quedó registrado para revisarlo. Puedes reintentar o volver a cargar la página.
        </p>
        <div className="flex justify-center gap-2">
          <button onClick={() => reset()}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
            Reintentar
          </button>
          <button onClick={() => window.location.reload()}
            className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Recargar página
          </button>
        </div>
      </div>
    </div>
  );
}
