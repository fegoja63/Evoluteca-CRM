/**
 * Avisos (web push) del lado del navegador: lo comparten "Mi perfil › App en tu
 * celular" y el aviso de "Activa los avisos" del Inicio en el celular.
 */

// Llave pública VAPID (base64url) → bytes, como la pide pushManager.subscribe.
export function llaveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${nav} en ${so}`;
}

export function esCelular(): boolean {
  return /iPhone|iPad|Android/.test(navigator.userAgent);
}

/** El CRM está abierto como app instalada (desde su ícono), no en el navegador. */
export function esAppInstalada(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function navegadorAdmiteAvisos(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Pide permiso, suscribe este dispositivo y lo registra en el servidor.
 * Devuelve "activo", "bloqueado" (el usuario dijo No), "apagado" (cerró sin
 * responder) o lanza si falla la suscripción o el registro.
 */
export async function activarAvisos(publicKey: string): Promise<"activo" | "bloqueado" | "apagado"> {
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueado" : "apagado";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveABytes(publicKey) });
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...sub.toJSON(), agente: nombreDispositivo() }),
  });
  if (!res.ok) throw new Error("No se pudo registrar el dispositivo");
  return "activo";
}
