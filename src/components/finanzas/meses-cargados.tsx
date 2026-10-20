"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconPencil } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { leerMonto } from "@/lib/finanzas/plantilla";
import type { Periodo } from "@/lib/finanzas/estados";
import { mesCorto } from "@/lib/finanzas/formato";
import { MONTOS, TablaMeses, aTexto, enviar } from "./comun";

const VACIO: Record<string, string> = Object.fromEntries(MONTOS.map(c => [c.clave, ""]));

/** 2. Meses cargados: la lista, y un formulario para agregar o corregir uno. */
export function MesesCargados({ periodos, soloLectura }: { periodos: Periodo[]; soloLectura: boolean }) {
  const router = useRouter();
  const [mes, setMes] = useState("");
  const [valores, setValores] = useState<Record<string, string>>(VACIO);
  const [guardando, setGuardando] = useState(false);

  function editar(p: Periodo) {
    setMes(p.mes);
    setValores(Object.fromEntries(MONTOS.map(c => [c.clave, aTexto(p[c.clave])])));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!mes || leerMonto(valores.ventas) === null) { toast.error("Escriba el mes y las ventas."); return; }
    const periodo = { mes, ...Object.fromEntries(MONTOS.map(c => [c.clave, leerMonto(valores[c.clave]) ?? 0])) };
    setGuardando(true);
    try {
      await enviar("/api/finanzas/periodos", "PUT", { periodos: [periodo] });
      toast.success(`${mesCorto(mes)} guardado.`);
      setMes("");
      setValores(VACIO);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(p: Periodo) {
    if (!confirm(`¿Borrar los resultados de ${mesCorto(p.mes)}?`)) return;
    try {
      await enviar(`/api/finanzas/periodos?mes=${p.mes}`, "DELETE");
      toast.success(`${mesCorto(p.mes)} borrado.`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <h2 className="text-base font-semibold text-slate-800">{soloLectura ? "Meses cargados" : "2. Meses cargados"}</h2>
      {periodos.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay meses cargados.</p>
      ) : (
        <TablaMeses periodos={[...periodos].reverse()} acciones={soloLectura ? undefined : p => (
          <span className="inline-flex gap-1">
            <button type="button" onClick={() => editar(p)} className={boton("fantasma", "sm")} aria-label={`Editar ${mesCorto(p.mes)}`}><IconPencil size={14} /></button>
            <button type="button" onClick={() => borrar(p)} className={boton("fantasma", "sm", "text-red-600")} aria-label={`Borrar ${mesCorto(p.mes)}`}><IconTrash size={14} /></button>
          </span>
        )} />
      )}

      {!soloLectura && (
        <form onSubmit={guardar} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Agregar o corregir un mes (en pesos)</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-500">
              Mes
              <input type="month" required value={mes} onChange={e => setMes(e.target.value)} className={campo("sm", "mt-1 block w-full")} />
            </label>
            {MONTOS.map(c => (
              <label key={c.clave} className="text-xs text-slate-500">
                {c.titulo}{c.clave === "ventas" ? " *" : ""}
                <input inputMode="decimal" value={valores[c.clave]} placeholder="0"
                  onChange={e => setValores(v => ({ ...v, [c.clave]: e.target.value }))}
                  className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
              </label>
            ))}
          </div>
          <button type="submit" disabled={guardando} className={boton("marca", "sm")}>{guardando ? "Guardando…" : "Guardar mes"}</button>
        </form>
      )}
    </section>
  );
}
