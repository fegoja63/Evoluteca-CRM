"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { boton, campo } from "@/components/ui/estilos";
import { leerMonto } from "@/lib/finanzas/plantilla";
import type { Supuestos } from "@/lib/finanzas/caja";
import { aTexto, enviar } from "./comun";
import { mesCorto } from "@/lib/finanzas/formato";

/** Este mes y los dos siguientes, "YYYY-MM". */
function proximosMeses(hoy: string): string[] {
  const [a, m] = hoy.split("-").map(Number);
  return [0, 1, 2].map(i => { const d = new Date(Date.UTC(a, m - 1 + i, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; });
}

const CAMPOS: { clave: Exclude<keyof Supuestos, "diasCobro" | "ventasProyectadas" | "diaImpuestos">; titulo: string; ayuda: string }[] = [
  { clave: "nominaMensual", titulo: "Nómina mensual", ayuda: "Salarios; se paga el 15 y el último día. De aquí salen la prima y las cesantías." },
  { clave: "gastosFijosMensuales", titulo: "Gastos fijos del mes (sin nómina)", ayuda: "Arriendo, servicios, software… se paga el día 1." },
  { clave: "cuotaDeudaMensual", titulo: "Cuotas de créditos al mes", ayuda: "Capital e intereses; se paga el día 5." },
  { clave: "proveedoresSemanales", titulo: "Pagos a proveedores por semana", ayuda: "Se paga cada viernes." },
  { clave: "impuestosMensuales", titulo: "Retención e impuestos del mes", ayuda: "Retención en la fuente y demás impuestos mensuales; se pagan el día de impuestos." },
  { clave: "ivaBimestral", titulo: "IVA por bimestre", ayuda: "Lo que paga de IVA cada dos meses (ene, mar, may, jul, sep, nov). 0 si no es responsable de IVA." },
  { clave: "ventasContadoSemanales", titulo: "Ventas de contado por semana", ayuda: "Lo que entra el mismo día (taquilla, mostrador)." },
];

type Props = { supuestos: Supuestos; guardados: boolean; soloLectura: boolean; soloFinanzas?: boolean; hoy?: string };

/** Supuestos de la caja proyectada: el cliente los ajusta a su operación. */
export function FormSupuestos({ supuestos, guardados, soloLectura, soloFinanzas = false, hoy = "" }: Props) {
  const meses = soloFinanzas && hoy ? proximosMeses(hoy) : [];
  const [ventas, setVentas] = useState<Record<string, string>>(
    Object.fromEntries(meses.map(m => [m, aTexto(supuestos.ventasProyectadas?.find(v => v.mes === m)?.monto ?? 0)])),
  );
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(CAMPOS.map(c => [c.clave, aTexto(supuestos[c.clave] ?? 0)])),
  );
  const [diasCobro, setDiasCobro] = useState(String(supuestos.diasCobro));
  const [diaImpuestos, setDiaImpuestos] = useState(String(supuestos.diaImpuestos ?? 18));
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await enviar("/api/finanzas/supuestos", "PUT", {
        ...Object.fromEntries(CAMPOS.map(c => [c.clave, leerMonto(valores[c.clave]) ?? 0])),
        diasCobro: Math.round(Number(diasCobro) || 0),
        diaImpuestos: Math.min(28, Math.max(1, Math.round(Number(diaImpuestos) || 18))),
        ventasProyectadas: meses.map(m => ({ mes: m, monto: leerMonto(ventas[m]) ?? 0 })).filter(v => v.monto > 0),
      });
      toast.success("Supuestos guardados.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-3">
      {!guardados && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Estos supuestos son <strong>sugeridos</strong> a partir de sus estados financieros (promedio de los últimos 3 meses).
          La nómina va incluida en los gastos fijos: si la separa, réstela de ahí. Revíselos y guárdelos.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPOS.map(c => (
          <label key={c.clave} className="text-xs text-slate-500">
            {c.titulo}
            <input inputMode="decimal" value={valores[c.clave]} placeholder="0" disabled={soloLectura}
              onChange={e => setValores(v => ({ ...v, [c.clave]: e.target.value }))}
              className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
            <span className="mt-0.5 block text-2xs text-slate-400">{c.ayuda}</span>
          </label>
        ))}
        <label className="text-xs text-slate-500">
          Días que tardan los clientes en pagar
          <input type="number" min={0} max={365} value={diasCobro} disabled={soloLectura}
            onChange={e => setDiasCobro(e.target.value)} className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
          <span className="mt-0.5 block text-2xs text-slate-400">Se usa para la cartera y para cuándo entra el dinero de un negocio cerrado.</span>
        </label>
        <label className="text-xs text-slate-500">
          Día del mes en que paga a la DIAN
          <input type="number" min={1} max={28} value={diaImpuestos} disabled={soloLectura}
            onChange={e => setDiaImpuestos(e.target.value)} className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
          <span className="mt-0.5 block text-2xs text-slate-400">Depende del último dígito del NIT (calendario tributario). Su contador se lo confirma.</span>
        </label>
      </div>
      {soloFinanzas && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-700">Ventas que espera (sin CRM)</p>
          <p className="text-xs text-slate-500">Lo que espera vender a crédito; entra a la caja al cierre de cada mes más los días de cobro.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {meses.map((m, i) => (
              <label key={m} className="text-xs text-slate-500">
                {i === 0 ? `Lo que falta vender en ${mesCorto(m)}` : `Ventas de ${mesCorto(m)}`}
                <input inputMode="decimal" value={ventas[m]} placeholder="0" disabled={soloLectura}
                  onChange={e => setVentas(v => ({ ...v, [m]: e.target.value }))}
                  className={campo("sm", "mt-1 block w-full text-right tabular-nums")} />
              </label>
            ))}
          </div>
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
            Con el CRM de Evoluteca estas cifras salen solas de sus oportunidades, con su probabilidad y fecha de cierre, y la alerta le dice qué negocio cerrar primero.
          </p>
        </div>
      )}
      {!soloLectura && (
        <button type="submit" disabled={guardando} className={boton("marca", "sm")}>{guardando ? "Guardando…" : "Guardar supuestos"}</button>
      )}
    </form>
  );
}
