"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  /** Clases para el ícono del ojo — permite adaptarlo a fondos oscuros o claros. */
  colorOjo?: string;
};

/**
 * Campo de contraseña con botón (ojo) para mostrar u ocultar lo que se escribe.
 *
 * Reemplaza directamente a un <input type="password">: acepta las mismas props
 * (incluido el `ref` que inyecta react-hook-form) y solo agrega el botón a la
 * derecha. Se le reserva espacio con un padding derecho para que el texto no
 * quede debajo del ícono.
 */
export const CampoPassword = forwardRef<HTMLInputElement, Props>(function CampoPassword(
  { className = "", colorOjo = "text-slate-400 hover:text-slate-600", style, ...props },
  ref,
) {
  const [ver, setVer] = useState(false);
  const etiqueta = ver ? "Ocultar contraseña" : "Ver contraseña";
  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={ver ? "text" : "password"}
        className={className}
        // Inline para ganarle siempre al padding de la clase, sin importar el orden.
        style={{ ...style, paddingRight: "2.5rem" }}
      />
      <button
        type="button"
        // El ojo no debe robar el foco al tabular por el formulario.
        tabIndex={-1}
        onClick={() => setVer((v) => !v)}
        aria-label={etiqueta}
        title={etiqueta}
        className={`absolute right-3 top-1/2 -translate-y-1/2 ${colorOjo}`}
      >
        {ver ? <IconEyeOff size={18} stroke={1.75} /> : <IconEye size={18} stroke={1.75} />}
      </button>
    </div>
  );
});
