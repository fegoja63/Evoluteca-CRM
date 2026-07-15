"use client";

import { useEffect } from "react";
import { reportarError } from "@/lib/error-report";

// Captura errores globales del navegador que no pasan por un error boundary de
// React (errores sueltos y promesas rechazadas sin catch) y los reporta al
// monitoreo propio. Se monta una sola vez en el layout raíz.
export function ErrorReporter() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      reportarError({
        mensaje: e.message || "Error de JavaScript",
        stack: e.error?.stack ?? (e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined),
        tipo: "client",
      });
    }
    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason;
      reportarError({
        mensaje: (r && (r.message || String(r))) || "Promesa rechazada sin manejar",
        stack: r?.stack,
        tipo: "unhandledrejection",
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
