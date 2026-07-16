"use client";

import { forwardRef } from "react";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  /** Valor crudo almacenado (dígitos, con "." como separador decimal). */
  value: string | number | null | undefined;
  /** Recibe el valor crudo (sin separadores de miles), listo para Number(). */
  onChange: (raw: string) => void;
};

// Convierte el texto digitado (formato es-CO: "." para miles, "," para
// decimales) al valor crudo que se guarda: sin separadores de miles y con "."
// como separador decimal para que Number() lo interprete bien.
function aCrudo(texto: string): string {
  let limpio = texto.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
  const partes = limpio.split(".");
  if (partes.length > 2) limpio = partes[0] + "." + partes.slice(1).join("");
  return limpio;
}

// Formatea el valor crudo con separadores de miles es-CO ("1.000.000") para
// mostrarlo en el input. Conserva la parte decimal si existe.
function aVisible(crudo: string): string {
  if (crudo === "") return "";
  const [ent, dec] = crudo.split(".");
  const entLimpio = ent.replace(/\D/g, "");
  const entFmt =
    entLimpio === "" ? "" : new Intl.NumberFormat("es-CO").format(Number(entLimpio));
  return dec !== undefined ? `${entFmt},${dec}` : entFmt;
}

/**
 * Input de moneda que muestra el separador de miles mientras se digita.
 * Reemplaza a `<input type="number">` para valores en pesos: mantiene el mismo
 * contrato (`value` es un string crudo, `onChange` devuelve un string crudo),
 * pero por debajo es un input de texto con formato visual.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ value, onChange, ...rest }, ref) {
    const crudo = value == null ? "" : String(value);
    return (
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={aVisible(crudo)}
        onChange={e => onChange(aCrudo(e.target.value))}
      />
    );
  }
);
