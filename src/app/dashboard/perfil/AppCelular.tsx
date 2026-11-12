"use client";

import { useEffect, useState } from "react";
import { IconDeviceMobile, IconBell, IconBellOff, IconDownload, IconCircleCheck } from "@tabler/icons-react";
import { boton, tarjeta } from "@/components/ui/estilos";
import { toast } from "@/lib/toast";

// Llave pública VAPID (base64url) → bytes, como la pide pushManager.subscribe.
function llaveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${nav} en ${so}`;
}

type Estado = "cargando" | "sin-soporte" | "ios-sin-instalar" | "bloqueado" | "apagado" | "activo" | "no-configurado";

/** Mi perfil › App en tu celular: instalar el CRM y activar avisos en este dispositivo. */
export default function AppCelular() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [instalable, setInstalable] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const alInstalable = () => setInstalable(true);
    window.addEventListener("evoluteca-instalable", alInstalable);

    (async () => {
      setInstalada(standalone);
      setInstalable(!!window.__evolutecaInstalar);
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado(ios && !standalone ? "ios-sin-instalar" : "sin-soporte");
        return;
      }
      const r = await fetch("/api/push").then(x => x.json()).catch(() => null);
      if (!r?.disponible) { setEstado("no-configurado"); return; }
      setPublicKey(r.publicKey);
      if (Notification.permission === "denied") { setEstado("bloqueado"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "activo" : "apagado");
    })();
    return () => window.removeEventListener("evoluteca-instalable", alInstalable);
  }, []);

  async function instalar() {
    const ev = window.__evolutecaInstalar;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    window.__evolutecaInstalar = null;
    setInstalable(false);
    if (outcome === "accepted") setInstalada(true);
  }

  async function activar() {
    if (!publicKey) return;
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "bloqueado" : "apagado"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llaveABytes(publicKey) });
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub.toJSON(), agente: nombreDispositivo() }),
      });
      if (!res.ok) throw new Error();
      setEstado("activo");
      toast.success("Avisos activados en este dispositivo.");
    } catch {
      toast.error("No se pudieron activar los avisos. Inténtalo de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado("apagado");
    } finally {
      setTrabajando(false);
    }
  }

  async function probar() {
    setTrabajando(true);
    const res = await fetch("/api/push/prueba", { method: "POST" }).catch(() => null);
    setTrabajando(false);
    if (!res?.ok) toast.error("No se pudo enviar el aviso de prueba.");
  }

  return (
    <div className={tarjeta("p-5 mt-6")}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
        <IconDeviceMobile size={16} stroke={1.75} /> App en tu celular
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Instala el CRM como una app (con su ícono en la pantalla de inicio) y recibe avisos en este dispositivo cuando
        un cliente abre una cotización o te asignan una tarea.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">1. Instalar la app</p>
          {instalada ? (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700">
              <IconCircleCheck size={15} stroke={2} /> Ya estás usando la app instalada.
            </p>
          ) : instalable ? (
            <button type="button" onClick={instalar} className={boton("primario", "md", "flex")}>
              <IconDownload size={15} stroke={1.75} /> Instalar Evoluteca CRM
            </button>
          ) : (
            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-500">
              <li><span className="font-medium text-slate-600">iPhone (Safari):</span> botón Compartir → &quot;Agregar a inicio&quot;.</li>
              <li><span className="font-medium text-slate-600">Android (Chrome):</span> menú ⋮ → &quot;Instalar app&quot; o &quot;Agregar a la pantalla principal&quot;.</li>
              <li><span className="font-medium text-slate-600">Computador (Chrome o Edge):</span> ícono de instalar en la barra de direcciones.</li>
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">2. Avisos en este dispositivo</p>
          {estado === "cargando" && <p className="text-xs text-slate-400">Revisando…</p>}
          {estado === "no-configurado" && <p className="text-xs text-slate-500">Los avisos todavía no están habilitados en tu cuenta.</p>}
          {estado === "sin-soporte" && <p className="text-xs text-slate-500">Este navegador no admite avisos. Prueba con Chrome, Edge o Safari actualizados.</p>}
          {estado === "ios-sin-instalar" && (
            <p className="text-xs text-slate-500">En iPhone los avisos funcionan desde la app instalada: agrégala a inicio (paso 1) y ábrela desde ese ícono.</p>
          )}
          {estado === "bloqueado" && (
            <p className="text-xs text-amber-700">
              Bloqueaste los avisos para este sitio. Actívalos en la configuración del navegador (ícono del candado junto a la dirección) y vuelve aquí.
            </p>
          )}
          {estado === "apagado" && (
            <button type="button" onClick={activar} disabled={trabajando} className={boton("primario", "md", "flex")}>
              <IconBell size={15} stroke={1.75} /> {trabajando ? "Activando…" : "Activar avisos"}
            </button>
          )}
          {estado === "activo" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                <IconCircleCheck size={15} stroke={2} /> Avisos activos aquí
              </span>
              <button type="button" onClick={probar} disabled={trabajando} className={boton("secundario", "sm", "flex")}>
                <IconBell size={14} stroke={1.75} /> Enviar aviso de prueba
              </button>
              <button type="button" onClick={desactivar} disabled={trabajando} className={boton("secundario", "sm", "flex")}>
                <IconBellOff size={14} stroke={1.75} /> Desactivar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
