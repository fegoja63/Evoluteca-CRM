import Link from "next/link";
import type { Alcance } from "@/lib/permisos";

/**
 * Interruptor "Mías / Equipo" de las vistas personales (Bandeja Hoy, Inicio).
 * Solo lo ven Administrador y Gerente; el alcance viaja en la URL
 * (?alcance=equipo) para que la página lo lea en el servidor.
 */
export function SelectorAlcance({ ruta, alcance }: { ruta: string; alcance: Alcance }) {
  const opciones: { valor: Alcance; label: string; href: string }[] = [
    { valor: "mias", label: "Mías", href: ruta },
    { valor: "equipo", label: "Equipo", href: `${ruta}?alcance=equipo` },
  ];
  return (
    <div role="group" aria-label="Ver mis tareas o las del equipo"
      className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-medium">
      {opciones.map(o => (
        <Link key={o.valor} href={o.href} aria-current={alcance === o.valor ? "true" : undefined}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            alcance === o.valor ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-800"
          }`}>
          {o.label}
        </Link>
      ))}
    </div>
  );
}
