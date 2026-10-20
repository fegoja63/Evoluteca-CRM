"use client";

import { useMemo, useState } from "react";
import { boton, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { proyectarCaja, diasEntre, type NegocioPipeline, type Supuestos } from "@/lib/finanzas/caja";
import { aplicarEscenario, esBase, ESCENARIO_BASE, type Escenario } from "@/lib/finanzas/simulador";
import { diaCorto, millones } from "@/lib/finanzas/formato";
import { GraficaCaja } from "./grafica-caja";

type Props = { hoy: string; caja: number; cartera: number; supuestos: Supuestos; pipeline: NegocioPipeline[] };

type Control = { clave: keyof Escenario; titulo: string; min: number; max: number; paso: number; formato: (v: number) => string };

const signo = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

/** "¿Qué pasa si…?": mueve las palancas y la caja se recalcula al instante. */
export function SimuladorCaja({ hoy, caja, cartera, supuestos, pipeline }: Props) {
  const [e, setE] = useState<Escenario>(ESCENARIO_BASE);
  const hayPipeline = pipeline.length > 0;

  const controles: Control[] = [
    ...(hayPipeline ? [{ clave: "cumplimientoPipeline" as const, titulo: "Se cumple del pipeline", min: 0, max: 150, paso: 10, formato: (v: number) => `${v}%` }] : []),
    { clave: "retrasoCobros", titulo: "Retraso en los cobros", min: 0, max: 60, paso: 5, formato: v => `${v} días` },
    { clave: "variacionNomina", titulo: "Nómina", min: -20, max: 50, paso: 5, formato: signo },
    { clave: "variacionGastos", titulo: "Gastos fijos y proveedores", min: -30, max: 30, paso: 5, formato: signo },
    { clave: "variacionContado", titulo: "Ventas de contado", min: -50, max: 50, paso: 10, formato: signo },
  ];

  const { base, sim } = useMemo(() => {
    const entrada = { hoy, saldoInicial: caja, cartera };
    return {
      base: proyectarCaja({ ...entrada, supuestos, pipeline }),
      sim: proyectarCaja({ ...entrada, ...aplicarEscenario(supuestos, pipeline, e) }),
    };
  }, [hoy, caja, cartera, supuestos, pipeline, e]);

  const dif = sim.minimo.saldo - base.minimo.saldo;
  const resultados = [
    { titulo: "Punto más bajo", valor: millones(sim.minimo.saldo), detalle: `${diaCorto(sim.minimo.dia)} · ${Math.abs(dif) < 500_000 ? "igual al actual" : `${dif > 0 ? "+" : "–"}${millones(Math.abs(dif))} vs. actual`}`, rojo: sim.minimo.saldo < 0 },
    { titulo: "Primer día en rojo", valor: sim.primerDiaEnRojo ? diaCorto(sim.primerDiaEnRojo) : "Ninguno", detalle: sim.primerDiaEnRojo ? `en ${diasEntre(hoy, sim.primerDiaEnRojo)} días` : "en las 13 semanas", rojo: !!sim.primerDiaEnRojo },
    { titulo: "Caja al final", valor: millones(sim.saldoFinal), detalle: `actual: ${millones(base.saldoFinal)}`, rojo: sim.saldoFinal < 0 },
  ];

  return (
    <div className={tarjeta("p-5 space-y-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Simulador: ¿qué pasa si…?</h2>
          <p className="mt-1 text-xs text-slate-500">Mueva las palancas para ver cómo cambia la caja. No se guarda nada.</p>
        </div>
        {!esBase(e) && <button type="button" onClick={() => setE(ESCENARIO_BASE)} className={boton("secundario", "sm")}>Volver al escenario actual</button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {controles.map(c => (
          <label key={c.clave} className="block text-sm text-slate-600">
            <span className="flex justify-between gap-2">
              {c.titulo}
              <output className={cn("font-semibold tabular-nums", e[c.clave] !== ESCENARIO_BASE[c.clave] ? "text-brand-700" : "text-slate-800")}>{c.formato(e[c.clave])}</output>
            </span>
            <input type="range" min={c.min} max={c.max} step={c.paso} value={e[c.clave]}
              onChange={ev => setE(prev => ({ ...prev, [c.clave]: Number(ev.target.value) }))}
              className="mt-2 w-full accent-brand-600" />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {resultados.map(r => (
          <div key={r.titulo} className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{r.titulo}</p>
            <p className={cn("mt-1 text-xl font-bold tabular-nums", r.rojo ? "text-red-600" : "text-slate-900")}>{r.valor}</p>
            <p className="mt-0.5 text-xs text-slate-500">{r.detalle}</p>
          </div>
        ))}
      </div>

      <GraficaCaja con={sim.semanas} sin={base.semanas} conPipeline={!esBase(e)}
        etiquetas={{ principal: esBase(e) ? "Escenario actual" : "Escenario simulado", comparacion: "Escenario actual" }} />
    </div>
  );
}
