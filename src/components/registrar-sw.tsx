"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (avisos push) y guarda el evento de instalación
 * del navegador para que Mi perfil pueda ofrecer "Instalar la app".
 * No renderiza nada.
 */
type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window { __evolutecaInstalar?: EventoInstalar | null }
}

export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const guardar = (e: Event) => {
      e.preventDefault();
      window.__evolutecaInstalar = e as EventoInstalar;
      window.dispatchEvent(new Event("evoluteca-instalable"));
    };
    const instalada = () => { window.__evolutecaInstalar = null; };
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);
  return null;
}
