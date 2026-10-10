"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon, IconDeviceDesktop, type Icon } from "@tabler/icons-react";

/**
 * Selector Día / Noche / Automático. La preferencia vive en este navegador
 * (localStorage "tema"); el script de SCRIPT_TEMA la aplica antes de pintar.
 * Por defecto es Día.
 */
export type Tema = "dia" | "noche" | "auto";

const CLAVE = "tema";
const ORDEN: Tema[] = ["dia", "noche", "auto"];
const OPCIONES: Record<Tema, { label: string; icon: Icon }> = {
  dia:   { label: "Día",        icon: IconSun },
  noche: { label: "Noche",      icon: IconMoon },
  auto:  { label: "Automático", icon: IconDeviceDesktop },
};

// Se inyecta en <head> (layout raíz) para poner la clase `dark` antes del
// primer pintado: sin destello blanco al abrir en modo noche.
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CLAVE}")||"dia";var d=t==="noche"||(t==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

function aplicar(tema: Tema) {
  const oscuro = tema === "noche" || (tema === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === "noche" || t === "auto" ? t : "dia";
  } catch {
    return "dia";
  }
}

export function SelectorTema() {
  const [tema, setTema] = useState<Tema>("dia");

  useEffect(() => { setTema(leer()); }, []);

  // En Automático, sigue al sistema si cambia mientras la app está abierta.
  useEffect(() => {
    if (tema !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => aplicar("auto");
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, [tema]);

  function siguiente() {
    const nuevo = ORDEN[(ORDEN.indexOf(tema) + 1) % ORDEN.length];
    setTema(nuevo);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* solo esta sesión */ }
    aplicar(nuevo);
  }

  const { label, icon: Icono } = OPCIONES[tema];
  return (
    <button type="button" onClick={siguiente}
      title={`Tema: ${label}. Clic para cambiar (Día → Noche → Automático)`}
      aria-label={`Tema: ${label}. Cambiar tema`}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-brand-200 hover:bg-white/5 hover:text-white transition-colors">
      <Icono size={17} stroke={1.75} />
      Tema: {label}
    </button>
  );
}
