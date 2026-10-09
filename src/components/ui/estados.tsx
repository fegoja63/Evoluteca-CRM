import type { ReactNode } from "react";
import type { Icon } from "@tabler/icons-react";
import { cx, tarjeta } from "./estilos";

/**
 * Estados de carga (skeletons) y estados vacíos.
 *
 * Los skeletons imitan la forma de lo que va a llegar (tabla, tarjetas,
 * kanban, ficha) para que la pantalla no "salte" al cargar los datos.
 */

export function Bloque({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rounded-lg bg-slate-200/70 animate-pulse", className)} />;
}

function Cargando({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

// Anchos que varían por fila para que no parezca una cuadrícula rígida.
const ANCHOS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-2/5"];

export function SkeletonTabla({ filas = 6, columnas = 5, className }: { filas?: number; columnas?: number; className?: string }) {
  return (
    <Cargando className={tarjeta(cx("overflow-hidden", className))}>
      <div className="flex gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
        {Array.from({ length: columnas }, (_, c) => <Bloque key={c} className="h-3 flex-1 max-w-24" />)}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: filas }, (_, f) => (
          <div key={f} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columnas }, (_, c) => (
              <div key={c} className="flex-1">
                <Bloque className={cx("h-3.5", ANCHOS[(f + c) % ANCHOS.length])} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Cargando>
  );
}

/** Filas sueltas, para listas dentro de una tarjeta que ya existe (historial, adjuntos…). */
export function SkeletonLista({ filas = 3, className }: { filas?: number; className?: string }) {
  return (
    <Cargando className={cx("space-y-3", className)}>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Bloque className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Bloque className={cx("h-3.5", ANCHOS[i % ANCHOS.length])} />
            <Bloque className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Cargando>
  );
}

export function SkeletonTarjetas({ n = 6, className }: { n?: number; className?: string }) {
  return (
    <Cargando className={cx("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={tarjeta("p-4 space-y-3")}>
          <Bloque className="h-8 w-8 rounded-xl" />
          <Bloque className={cx("h-4", ANCHOS[i % ANCHOS.length])} />
          <Bloque className="h-3 w-1/3" />
        </div>
      ))}
    </Cargando>
  );
}

export function SkeletonKpis({ n = 4 }: { n?: number }) {
  return (
    <Cargando className={cx("grid grid-cols-2 gap-3", n === 5 ? "sm:grid-cols-5" : n === 3 ? "sm:grid-cols-3" : "lg:grid-cols-4")}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={tarjeta("p-5 space-y-3")}>
          <Bloque className="h-9 w-9 rounded-xl" />
          <Bloque className="h-6 w-1/2" />
          <Bloque className="h-3 w-2/3" />
        </div>
      ))}
    </Cargando>
  );
}

export function SkeletonKanban({ columnas = 6 }: { columnas?: number }) {
  return (
    <Cargando className="flex gap-3 overflow-hidden">
      {Array.from({ length: columnas }, (_, c) => (
        <div key={c} className="w-64 shrink-0 space-y-3 rounded-2xl bg-slate-100/70 p-3">
          <Bloque className="h-4 w-1/2" />
          {Array.from({ length: 3 - (c % 2) }, (_, i) => (
            <div key={i} className={tarjeta("p-3 space-y-2")}>
              <Bloque className={cx("h-3.5", ANCHOS[(c + i) % ANCHOS.length])} />
              <Bloque className="h-3 w-1/3" />
              <Bloque className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </Cargando>
  );
}

/** Ficha de detalle: encabezado + columna principal + columna lateral. */
export function SkeletonDetalle() {
  return (
    <Cargando className="space-y-6">
      <div className="space-y-2">
        <Bloque className="h-3 w-24" />
        <Bloque className="h-7 w-72 max-w-full" />
        <Bloque className="h-3.5 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[0, 1].map(i => (
            <div key={i} className={tarjeta("p-5 space-y-3")}>
              <Bloque className="h-4 w-40" />
              <Bloque className="h-3.5 w-full" />
              <Bloque className="h-3.5 w-5/6" />
              <Bloque className="h-3.5 w-2/3" />
            </div>
          ))}
        </div>
        <div className={tarjeta("p-5 space-y-3 h-fit")}>
          <Bloque className="h-4 w-28" />
          {[0, 1, 2, 3].map(i => <Bloque key={i} className={cx("h-3.5", ANCHOS[i])} />)}
        </div>
      </div>
    </Cargando>
  );
}

/** Lista o tabla sin registros: ícono, mensaje y (opcional) la acción para empezar. */
export function EstadoVacio({
  icon: Icono, titulo, descripcion, accion, className,
}: { icon?: Icon; titulo: string; descripcion?: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center", className)}>
      {Icono && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
          <Icono size={24} stroke={1.5} className="text-brand-600" />
        </div>
      )}
      <p className="text-sm font-semibold text-slate-800">{titulo}</p>
      {descripcion && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{descripcion}</p>}
      {accion && <div className="mt-5 flex justify-center">{accion}</div>}
    </div>
  );
}
