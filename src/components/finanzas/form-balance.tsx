"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { leerMonto } from "@/lib/finanzas/plantilla";
import { totalesBalance, balanceCuadra, type Balance } from "@/lib/finanzas/estados";
import { millones } from "@/lib/finanzas/formato";
import { aTexto, enviar } from "./comun";

const CAMPOS: { clave: keyof Balance; titulo: string; grupo: "Activo" | "Pasivo" | "Patrimonio" }[] = [
  { clave: "caja", titulo: "Caja y bancos", grupo: "Activo" },
  { clave: "cuentasPorCobrar", titulo: "Cuentas por cobrar", grupo: "Activo" },
  { clave: "inventario", titulo: "Inventario", grupo: "Activo" },
  { clave: "otrosActivosCorrientes", titulo: "Otros activos corrientes", grupo: "Activo" },
  { clave: "activosFijos", titulo: "Activos fijos netos", grupo: "Activo" },
  { clave: "proveedores", titulo: "Proveedores", grupo: "Pasivo" },
  { clave: "obligacionesCP", titulo: "Obligaciones financieras de corto plazo", grupo: "Pasivo" },
  { clave: "impuestosLaborales", titulo: "Impuestos y obligaciones laborales", grupo: "Pasivo" },
  { clave: "deudaLP", titulo: "Deuda de largo plazo", grupo: "Pasivo" },
  { clave: "patrimonio", titulo: "Patrimonio", grupo: "Patrimonio" },
];

type Props = { balance: (Balance & { corte: string }) | null; soloLectura: boolean };

/** 4. Balance general a una fecha de corte, con el chequeo de cuadre en vivo. */
export function FormBalance({ balance, soloLectura }: Props) {
  const router = useRouter();
  const [corte, setCorte] = useState(balance?.corte ?? "");
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(CAMPOS.map(c => [c.clave, balance ? aTexto(balance[c.clave]) : ""])),
  );
  const [guardando, setGuardando] = useState(false);

  const numeros = Object.fromEntries(CAMPOS.map(c => [c.clave, leerMonto(valores[c.clave]) ?? 0])) as Balance;
  const t = totalesBalance(numeros);
  const hayDatos = Object.values(valores).some(v => v.trim() !== "");
  const cuadra = balanceCuadra(numeros);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!corte) { toast.error("Escriba la fecha de corte del balance."); return; }
    if (valores.patrimonio.trim() === "") { toast.error("Escriba el patrimonio."); return; }
    setGuardando(true);
    try {
      await enviar("/api/finanzas/balance", "PUT", { corte, ...numeros });
      toast.success("Balance guardado.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section id="balance" className={tarjeta("p-5 space-y-3")}>
      <div>
        <h2 className="text-base font-semibold text-slate-800">{soloLectura ? "Balance general" : "4. Balance general"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Las cifras del balance a una fecha de corte (en pesos). Los indicadores usan el último corte guardado.
        </p>
      </div>
      <form onSubmit={guardar} className="space-y-3">
        <label className="block max-w-xs text-xs text-slate-500">
          Fecha de corte
          <input type="date" required value={corte} disabled={soloLectura} onChange={e => setCorte(e.target.value)} className={campo("sm", "mt-1 block w-full")} />
        </label>
        {(["Activo", "Pasivo", "Patrimonio"] as const).map(g => (
          <div key={g}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS.filter(c => c.grupo === g).map(c => (
                <label key={c.clave} className="text-xs text-slate-500">
                  {c.titulo}
                  <input inputMode="decimal" value={valores[c.clave]} placeholder="0" disabled={soloLectura}
                    onChange={e => setValores(v => ({ ...v, [c.clave]: e.target.value }))}
                    className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
                </label>
              ))}
            </div>
          </div>
        ))}
        {hayDatos && (
          <p className={cn("rounded-lg px-3 py-2 text-sm", cuadra ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
            Activo {millones(t.activoTotal)} · Pasivo + patrimonio {millones(t.pasivoTotal + numeros.patrimonio)} ·{" "}
            {cuadra ? "el balance cuadra." : `no cuadra por ${millones(t.diferencia)}: revise las cifras.`}
          </p>
        )}
        {!soloLectura && (
          <button type="submit" disabled={guardando} className={boton("marca", "sm")}>{guardando ? "Guardando…" : "Guardar balance"}</button>
        )}
      </form>
    </section>
  );
}
