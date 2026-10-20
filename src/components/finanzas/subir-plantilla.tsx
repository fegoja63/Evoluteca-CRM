"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconDownload, IconUpload } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import type { Unidad } from "@/lib/finanzas/plantilla";
import type { Periodo } from "@/lib/finanzas/estados";
import { TablaMeses, enviar } from "./comun";

/** 2. Subir la plantilla mensual: se lee, se muestra y el usuario confirma. */
export function SubirPlantilla() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [unidad, setUnidad] = useState<Unidad>("pesos");
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [lectura, setLectura] = useState<{ periodos: Periodo[]; errores: string[] } | null>(null);

  async function leer() {
    if (!archivo) return;
    setLeyendo(true);
    const form = new FormData();
    form.append("archivo", archivo);
    form.append("unidad", unidad);
    const res = await fetch("/api/finanzas/importar", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setLeyendo(false);
    if (!res.ok) { toast.error(data.error ?? "No se pudo leer el archivo."); return; }
    setLectura(data);
  }

  async function guardar() {
    if (!lectura?.periodos.length) return;
    setGuardando(true);
    try {
      await enviar("/api/finanzas/periodos", "PUT", { periodos: lectura.periodos });
      toast.success(`${lectura.periodos.length} mes(es) guardado(s).`);
      setLectura(null);
      setArchivo(null);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <div>
        <h2 className="text-base font-semibold text-slate-800">2. O suba la plantilla mensual</h2>
        <p className="mt-1 text-sm text-slate-500">
          Una fila por mes con el estado de resultados. Descárguela, llénela en Excel (o pídasela a su contador) y súbala.
          Si un mes ya estaba cargado, se reemplaza.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/finanzas/plantilla" className={boton("secundario", "sm")}><IconDownload size={15} />Descargar plantilla</a>
        <label className={boton("secundario", "sm", "cursor-pointer")}>
          <IconUpload size={15} />{archivo ? archivo.name : "Elegir archivo (.xlsx o .csv)"}
          <input type="file" accept=".xlsx,.csv,.txt" className="sr-only"
            onChange={e => { setArchivo(e.target.files?.[0] ?? null); setLectura(null); }} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          Las cifras están en
          <select value={unidad} onChange={e => { setUnidad(e.target.value as Unidad); setLectura(null); }} className={campo("sm")}>
            <option value="pesos">pesos</option>
            <option value="miles">miles de pesos</option>
            <option value="millones">millones de pesos</option>
          </select>
        </label>
        <button type="button" onClick={leer} disabled={!archivo || leyendo} className={boton("marca", "sm")}>
          {leyendo ? "Leyendo…" : "Leer archivo"}
        </button>
      </div>

      {lectura && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {lectura.errores.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {lectura.errores.map(e => <li key={e}>{e}</li>)}
            </ul>
          )}
          {/* Ventas de menos de $100.000 al mes casi siempre son cifras en miles o millones. */}
          {unidad !== "millones" && lectura.periodos.length > 0 && Math.max(...lectura.periodos.map(p => p.ventas)) < 100_000 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Las ventas se ven muy bajas. ¿Las cifras están en miles o en millones? Cambie la unidad arriba y vuelva a leer el archivo.
            </p>
          )}
          {lectura.periodos.length > 0 && (
            <>
              <p className="text-sm text-slate-700">
                Se leyeron <strong>{lectura.periodos.length}</strong> mes(es). Revise que las cifras estén bien antes de guardar:
              </p>
              <TablaMeses periodos={lectura.periodos} />
              <button type="button" onClick={guardar} disabled={guardando} className={boton("primario", "md")}>
                {guardando ? "Guardando…" : `Guardar ${lectura.periodos.length} mes(es)`}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
