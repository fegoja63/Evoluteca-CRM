import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import {
  boton, campo, tarjeta, insignia,
  type VarianteBoton, type TamanoBoton, type TamanoCampo, type TonoInsignia,
} from "./estilos";

export { boton, campo, tarjeta, insignia, cx } from "./estilos";
export type { VarianteBoton, TamanoBoton, TamanoCampo, TonoInsignia } from "./estilos";

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton; tamano?: TamanoBoton };

export const Button = forwardRef<HTMLButtonElement, BotonProps>(function Button(
  { variante = "primario", tamano = "md", className, type = "button", ...props }, ref,
) {
  return <button ref={ref} type={type} className={boton(variante, tamano, className)} {...props} />;
});

// Los campos reenvían la ref para funcionar con react-hook-form (register).

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { tamano?: TamanoCampo }>(
  function Input({ tamano = "md", className, ...props }, ref) {
    return <input ref={ref} className={campo(tamano, className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { tamano?: TamanoCampo }>(
  function Select({ tamano = "md", className, ...props }, ref) {
    return <select ref={ref} className={campo(tamano, className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { tamano?: TamanoCampo }>(
  function Textarea({ tamano = "md", className, ...props }, ref) {
    return <textarea ref={ref} className={campo(tamano, className)} {...props} />;
  },
);

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={tarjeta(className)} {...props} />;
}

export function Badge({ tono = "neutro", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tono?: TonoInsignia }) {
  return <span className={insignia(tono, className)} {...props} />;
}

export { Bloque, SkeletonLista, SkeletonTabla, SkeletonTarjetas, SkeletonKpis, SkeletonKanban, SkeletonDetalle, EstadoVacio } from "./estados";
