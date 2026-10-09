"use client";

import { useEffect, useRef } from "react";

/**
 * Cierra un modal o panel con la tecla Escape mientras `activo` sea true.
 *
 * `alCerrar` debe hacer lo mismo que el botón "Cancelar" del modal (incluida
 * cualquier limpieza de estado). Se guarda en una ref para no re-suscribir el
 * listener en cada render; solo se suscribe mientras el modal está abierto.
 * Para impedir el cierre (p. ej. mientras se guarda), pasa `activo` en false.
 */
export function useEscape(activo: boolean, alCerrar: () => void) {
  const alCerrarRef = useRef(alCerrar);
  useEffect(() => {
    alCerrarRef.current = alCerrar;
  });

  useEffect(() => {
    if (!activo) return;
    const alPresionar = (e: KeyboardEvent) => {
      // Un campo que ya manejó Escape (cancelar una edición en línea) gana.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      alCerrarRef.current();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [activo]);
}
