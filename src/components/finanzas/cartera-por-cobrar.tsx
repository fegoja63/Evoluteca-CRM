"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { leerMonto } from "@/lib/finanzas/plantilla";
import { millones } from "@/lib/finanzas/formato";
import { formatoDia } from "@/lib/fecha-bogota";
import { enviar } from "./comun";

type Factura = { id: string; cliente: string; monto: number; vence: string };

type Props = { facturas: Factura[]; carteraBalance: number | null; hoy: string; soloLectura: boolean };

/**
 * 5. Cartera por cliente (opcional): cada factura con su vencimiento. Con ella,
 * la caja cobra cada factura en su fecha en lugar de repartir el total del balance.
 */
export function CarteraPorCobrar({ facturas, carteraBalance, hoy, soloLectura }: Props) {
  const router = useRouter();
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState("");
  const [vence, setVence] = useState("");
  const [guardando, setGuardando] = useState(false);
  const total = facturas.reduce((a, f) => a + f.monto, 0);
  const vencido = facturas.filter(f => f.vence < hoy).reduce((a, f) => a + f.monto, 0);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const m = leerMonto(monto);
    if (!cliente.trim() || !m || !vence) { toast.error("Escriba el cliente, el monto y la fecha de vencimiento."); return; }
    setGuardando(true);
    try {
      await enviar("/api/finanzas/cartera", "POST", { facturas: [{ cliente: cliente.trim(), monto: m, vence }] });
      setCliente(""); setMonto(""); setVence("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(url: string, pregunta: string) {
    if (!confirm(pregunta)) return;
    try {
      await enviar(url, "DELETE");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <section className={tarjeta("p-5 space-y-3")}>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{soloLectura ? "Cartera por cliente" : "5. Cartera por cliente (opcional)"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Las facturas que le deben, con su vencimiento. Si las carga, la caja proyectada cobra cada una en su fecha (una vencida, en 15 días)
          en lugar de repartir el total del balance.
        </p>
      </div>

      {facturas.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                  <th className="px-3 py-2 text-left font-semibold">Vence</th>
                  {!soloLectura && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturas.map(f => (
                  <tr key={f.id}>
                    <td className="px-3 py-1.5 text-slate-700">{f.cliente}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{millones(f.monto)}</td>
                    <td className={f.vence < hoy ? "px-3 py-1.5 font-medium text-red-600" : "px-3 py-1.5 text-slate-600"}>
                      {formatoDia(f.vence)}{f.vence < hoy ? " (vencida)" : ""}
                    </td>
                    {!soloLectura && (
                      <td className="px-3 py-1.5 text-right">
                        <button type="button" onClick={() => borrar(`/api/finanzas/cartera?id=${f.id}`, `¿Borrar la factura de ${f.cliente}?`)}
                          className={boton("fantasma", "sm", "text-red-600")} aria-label={`Borrar la factura de ${f.cliente}`}><IconTrash size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Total {millones(total)}{vencido > 0 ? `, de los cuales ${millones(vencido)} están vencidos` : ""}.
            {carteraBalance !== null && Math.abs(total - carteraBalance) > 1_000_000 && ` El balance dice ${millones(carteraBalance)} de cuentas por cobrar: revise si falta alguna factura.`}
          </p>
        </>
      )}

      {!soloLectura && (
        <form onSubmit={agregar} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-500">
            Cliente
            <input value={cliente} onChange={e => setCliente(e.target.value)} maxLength={120} className={campo("sm", "mt-1 block w-48")} />
          </label>
          <label className="text-xs text-slate-500">
            Monto (pesos)
            <input inputMode="decimal" value={monto} onChange={e => setMonto(e.target.value)} className={campo("sm", "mt-1 block w-36 text-right tabular-nums")} />
          </label>
          <label className="text-xs text-slate-500">
            Vence
            <input type="date" value={vence} onChange={e => setVence(e.target.value)} className={campo("sm", "mt-1 block")} />
          </label>
          <button type="submit" disabled={guardando} className={boton("marca", "sm")}>{guardando ? "Guardando…" : "Agregar factura"}</button>
          {facturas.length > 0 && (
            <button type="button" onClick={() => borrar("/api/finanzas/cartera?todas=1", "¿Borrar toda la cartera por cliente? La caja volverá a usar el total del balance.")}
              className={boton("secundario", "sm")}>Borrar toda la cartera</button>
          )}
        </form>
      )}
    </section>
  );
}
