"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconFileUpload } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

// Cada pestaña con una explicación corta de qué se hace ahí: aparece al pasar
// el cursor o al llegar con el teclado (Tab).
const PESTANAS: { href: string; label: string; ayuda: string; destacada?: boolean }[] = [
  { href: "/dashboard/finanzas", label: "Resumen",
    ayuda: "Cómo va su empresa de un vistazo: ventas, utilidad, caja de hoy, la alerta de caja y lo que conviene revisar." },
  { href: "/dashboard/finanzas/subir", label: "Subir estados", destacada: true,
    ayuda: "Suba el archivo que le entregó su contador (PDF, Excel, Word o una foto; cierre del año o meses). La IA lee las cifras y usted las revisa antes de guardar. Usa 1 crédito de IA." },
  { href: "/dashboard/finanzas/informe", label: "Informe",
    ayuda: "El informe de análisis del mes o del año, listo para socios o junta: gráficas, escenarios, qué pasa si y plan de acción. Se descarga en PDF. Usa 1 crédito de IA." },
  { href: "/dashboard/finanzas/caja", label: "Caja proyectada",
    ayuda: "Cuánta plata tendrá semana a semana en las próximas 13 semanas, cuándo podría faltar y qué hacer. Incluye el simulador «¿qué pasa si…?»." },
  { href: "/dashboard/finanzas/estados", label: "Estados financieros",
    ayuda: "Su estado de resultados y su balance, ordenados y comparados con el periodo anterior." },
  { href: "/dashboard/finanzas/indicadores", label: "Indicadores",
    ayuda: "Liquidez, endeudamiento, rentabilidad y ciclo de caja, con semáforo y explicados en palabras simples." },
  { href: "/dashboard/finanzas/clientes", label: "Rentabilidad por cliente",
    ayuda: "Qué clientes le dejan más plata y cuáles le compran mucho pero le dejan poco o le pagan tarde." },
  { href: "/dashboard/finanzas/gerente", label: "Gerente IA",
    ayuda: "Pregúntele a sus números: un gerente financiero con IA le responde con sus propias cifras. Cada consulta usa 1 crédito de IA." },
  { href: "/dashboard/finanzas/cargar", label: "Cargar a mano",
    ayuda: "Escriba las cifras usted mismo o use la plantilla de Excel: meses, balance y cartera por cliente." },
];

type Ayuda = { texto: string; x: number; y: number };

export function PestanasFinanzas() {
  const pathname = usePathname();
  // La fila de pestañas se desplaza de lado (overflow), y un globo dentro de
  // ella quedaría cortado: se muestra uno solo, fijo en la pantalla, debajo
  // de la pestaña señalada.
  const [ayuda, setAyuda] = useState<Ayuda | null>(null);

  function mostrar(e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, texto: string) {
    const r = e.currentTarget.getBoundingClientRect();
    const ancho = 288;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - ancho / 2), window.innerWidth - ancho - 8);
    setAyuda({ texto, x, y: r.bottom + 8 });
  }

  return (
    <>
      {/* En el celular las pestañas se desplazan con el dedo; sin barra visible. */}
      <nav className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Secciones del Gerente Financiero">
        {PESTANAS.map((p, i) => {
          const activa = pathname === p.href;
          return (
            <Link key={p.href} href={p.href} aria-current={activa ? "page" : undefined} aria-describedby={`ayuda-finanzas-${i}`}
              onMouseEnter={e => mostrar(e, p.ayuda)} onMouseLeave={() => setAyuda(null)}
              onFocus={e => mostrar(e, p.ayuda)} onBlur={() => setAyuda(null)} onClick={() => setAyuda(null)}
              className={cn(
                "whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors",
                "inline-flex items-center gap-1.5",
                activa
                  ? "border-brand-700 bg-brand-700 text-white"
                  : p.destacada
                    ? "border-accent-300 bg-accent-50 text-accent-800 hover:border-accent-400 hover:bg-accent-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800",
              )}>
              {p.destacada && <IconFileUpload size={15} stroke={1.75} />}
              {p.label}
              {/* Para lectores de pantalla, la misma explicación. */}
              <span id={`ayuda-finanzas-${i}`} className="sr-only">{p.ayuda}</span>
            </Link>
          );
        })}
      </nav>
      {ayuda && (
        <div role="tooltip" aria-hidden
          className="pointer-events-none fixed z-50 w-72 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
          style={{ left: ayuda.x, top: ayuda.y }}>
          {ayuda.texto}
        </div>
      )}
    </>
  );
}
