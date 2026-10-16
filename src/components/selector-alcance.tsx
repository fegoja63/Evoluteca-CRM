import Link from "next/link";
import type { Alcance } from "@/lib/permisos";

/**
 * Interruptor "Mías / Equipo" de las vistas personales (Bandeja Hoy, Inicio).
 * Solo lo ven Administrador y Gerente; el alcance viaja en la URL
 * (?alcance=mias | equipo) para que la página lo lea en el servidor.
 */
export function SelectorAlcance({ ruta, alcance }: { ruta: string; alcance: Alcance }) {
  const opciones: { valor: Alcance; label: string; href: string }[] = [
    // Explícito en ambos: el valor por defecto depende del rol.
    { valor: "mias", label: "Mías", href: `${ruta}?alcance=mias` },
    { valor: "equipo", label: "Equipo", href: `${ruta}?alcance=equipo` },
  ];
  return (
    <div role="group" aria-label="Ver mis tareas o las del equipo"
      className="inline-flex rounded-xl border border-accent-200 bg-accent-50 p-0.5 text-xs font-semibold">
      {opciones.map(o => (
        <Link key={o.valor} href={o.href} aria-current={alcance === o.valor ? "true" : undefined}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            alcance === o.valor ? "bg-accent-600 text-white shadow-sm" : "text-accent-700 hover:bg-accent-100"
          }`}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}
