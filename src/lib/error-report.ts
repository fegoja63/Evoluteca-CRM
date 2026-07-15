// Reporta un error del cliente al monitoreo propio (POST /api/errores).
// Fire-and-forget: usa sendBeacon cuando existe (sobrevive a la recarga que
// suele seguir a un crash) y nunca lanza.

let ultimoEnvio = 0;
let ultimoMensaje = "";

export function reportarError(payload: { mensaje: string; stack?: string; url?: string; tipo?: string }) {
  try {
    if (typeof window === "undefined") return;
    // Anti-spam: no repetir el mismo mensaje en ráfaga (evita inundar por un
    // error que se dispara en bucle).
    const ahora = Date.now();
    if (payload.mensaje === ultimoMensaje && ahora - ultimoEnvio < 5000) return;
    ultimoMensaje = payload.mensaje;
    ultimoEnvio = ahora;

    const body = JSON.stringify({
      mensaje: payload.mensaje,
      stack: payload.stack,
      tipo: payload.tipo ?? "client",
      url: payload.url ?? window.location.href,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/errores", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/errores", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* el reportador jamás debe romper */ }
}
