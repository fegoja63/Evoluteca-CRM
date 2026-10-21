"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { leerMonto } from "@/lib/finanzas/plantilla";
import type { ClienteRentabilidad } from "@/lib/finanzas/rentabilidad";
import { aTexto, enviar } from "./comun";

type Fila = { cliente: string; ventas: string; costo: string; diasPago: string };

const aFila = (c: ClienteRentabilidad): Fila => ({ cliente: c.cliente, ventas: aTexto(c.ventas), costo: aTexto(c.costo), diasPago: c.diasPago === null ? "" : String(c.diasPago) });

type Props = {
  clientes: ClienteRentabilidad[];
  /** Ventas de los últimos 12 meses por cliente, según los negocios ganados del CRM. */
  sugeridosCRM: ClienteRentabilidad[];
  soloLectura: boolean;
};

/** Editar la rentabilidad por cliente: ventas, costo directo y días de pago (12 meses, en pesos). */
export function EditorRentabilidad({ clientes, sugeridosCRM, soloLectura }: Props) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(clientes.length ? clientes.map(aFila) : [{ cliente: "", ventas: "", costo: "", diasPago: "" }]);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (i: number, k: keyof Fila, v: string) => setFilas(fs => fs.map((f, j) => (j === i ? { ...f, [k]: v } : f)));

  function traerDelCRM() {
    // Agrega los clientes del CRM que aún no están; los existentes conservan lo escrito.
    const ya = new Set(filas.map(f => f.cliente.trim().toLowerCase()));
    const nuevos = sugeridosCRM.filter(c => !ya.has(c.cliente.toLowerCase())).map(aFila);
    setFilas(fs => [...fs.filter(f => f.cliente.trim() || f.ventas.trim()), ...nuevos]);
    toast.success(nuevos.length ? `${nuevos.length} cliente(s) traído(s) del CRM. Complete el costo de cada uno.` : "Ya están todos los clientes del CRM.");
  }

  async function guardar() {
    const clientesOk = filas
      .filter(f => f.cliente.trim())
      .map(f => ({
        cliente: f.cliente.trim(), ventas: leerMonto(f.ventas) ?? 0, costo: leerMonto(f.costo) ?? 0,
        diasPago: f.diasPago.trim() === "" ? null : Math.max(0, Math.min(365, Math.round(Number(f.diasPago) || 0))),
      }));
    setGuardando(true);
    try {
      await enviar("/api/finanzas/rentabilidad", "PUT", { clientes: clientesOk });
      toast.success(`${clientesOk.length} cliente(s) guardado(s).`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Sus clientes, últimos 12 meses</h2>
          <p className="mt-1 text-xs text-slate-500">En pesos. El costo es el costo directo de lo que se le vendió a ese cliente; los días de pago, cuánto tarda en pagarle.</p>
        </div>
        {!soloLectura && sugeridosCRM.length > 0 && (
          <button type="button" onClick={traerDelCRM} className={boton("secundario", "sm")}>Traer ventas del CRM</button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-1 py-1 text-left font-semibold">Cliente</th>
              <th className="px-1 py-1 text-right font-semibold">Ventas</th>
              <th className="px-1 py-1 text-right font-semibold">Costo directo</th>
              <th className="px-1 py-1 text-right font-semibold">Días de pago</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i}>
                <td className="px-1 py-1"><input value={f.cliente} disabled={soloLectura} maxLength={120} onChange={e => cambiar(i, "cliente", e.target.value)} className={campo("sm", "w-full min-w-40")} aria-label="Cliente" /></td>
                <td className="px-1 py-1"><input value={f.ventas} disabled={soloLectura} inputMode="decimal" onChange={e => cambiar(i, "ventas", e.target.value)} className={campo("sm", "w-36 text-right tabular-nums")} aria-label="Ventas" /></td>
                <td className="px-1 py-1"><input value={f.costo} disabled={soloLectura} inputMode="decimal" onChange={e => cambiar(i, "costo", e.target.value)} className={campo("sm", "w-36 text-right tabular-nums")} aria-label="Costo directo" /></td>
                <td className="px-1 py-1"><input value={f.diasPago} disabled={soloLectura} type="number" min={0} max={365} onChange={e => cambiar(i, "diasPago", e.target.value)} className={campo("sm", "w-20 text-right tabular-nums")} aria-label="Días de pago" /></td>
                <td className="px-1 py-1 text-right">
                  {!soloLectura && (
                    <button type="button" onClick={() => setFilas(fs => fs.filter((_, j) => j !== i))} className={boton("fantasma", "sm", "text-red-600")} aria-label="Quitar cliente"><IconTrash size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!soloLectura && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilas(fs => [...fs, { cliente: "", ventas: "", costo: "", diasPago: "" }])} className={boton("secundario", "sm")}>
            <IconPlus size={14} />Agregar cliente
          </button>
          <button type="button" onClick={guardar} disabled={guardando} className={boton("marca", "sm")}>{guardando ? "Guardando…" : "Guardar"}</button>
        </div>
      )}
    </section>
  );
}
