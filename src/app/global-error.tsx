"use client";

import { useEffect } from "react";
import { reportarError } from "@/lib/error-report";

// Error boundary raíz de Next.js: atrapa cualquier crash de render que no tenga
// un boundary más cercano, lo reporta al monitoreo propio y muestra una
// pantalla amable en vez del "Application error" en blanco.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportarError({ mensaje: error?.message || "Application error", stack: error?.stack, tipo: "boundary" });
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#1e293b" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
            <h1 style={{ fontSize: 18, margin: "0 0 8px", color: "#0f172a" }}>Algo salió mal</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
              Ocurrió un error inesperado. Ya quedó registrado para que lo revisemos. Puedes intentar de nuevo.
            </p>
            <button
              onClick={() => reset()}
              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
