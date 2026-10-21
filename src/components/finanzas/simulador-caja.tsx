"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { proyectarCaja, diasEntre, claveNegocio, type NegocioPipeline, type Supuestos } from "@/lib/finanzas/caja";
import { aplicarEscenario, esBase, ESCENARIO_BASE, type Escenario } from "@/lib/finanzas/simulador";
import { leerMonto } from "@/lib/finanzas/plantilla";
import { diaCorto, millones } from "@/lib/finanzas/formato";
import { GraficaCaja } from "./grafica-caja";

type Props = {
  hoy: string;
  caja: number;
  cartera: number;
  supuestos: Supuestos;
  pipeline: NegocioPipeline[];
  /** Negocios que llegan ya marcados como cerrados (desde "Simular estos cierres"). */
  forzadosIniciales?: string[];
};

type Control = { clave: "cumplimientoPipeline" | "retrasoCobros" | "variacionNomina" | "personasNuevas" | "variacionGastos" | "variacionContado"; titulo: string; min: number; max: number; paso: number; formato: (v: number) => string };

const signo = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
const MAX_NEGOCIOS = 8;

/** "¿Qué pasa si…?": mueve las palancas y la caja se recalcula al instante. */
export function SimuladorCaja({ hoy, caja, cartera, supuestos, pipeline, forzadosIniciales = [] }: Props) {
  const [e, setE] = useState<Escenario>({ ...ESCENARIO_BASE, forzados: forzadosIniciales });
  const [costoTexto, setCostoTexto] = useState(Math.round(ESCENARIO_BASE.costoPersona).toLocaleString("es-CO"));
  const hayPipeline = pipeline.length > 0;
  const hayVentasProyectadas = (supuestos.ventasProyectadas?.length ?? 0) > 0;

  const controles: Control[] = [
    ...(hayPipeline || hayVentasProyectadas
      ? [{ clave: "cumplimientoPipeline" as const, titulo: hayPipeline ? "Se cumple del pipeline" : "Se cumplen las ventas proyectadas", min: 0, max: 150, paso: 10, formato: (v: number) => `${v}%` }]
      : []),
    { clave: "retrasoCobros", titulo: "Retraso en los cobros", min: 0, max: 60, paso: 5, formato: v => `${v} días` },
    { clave: "personasNuevas", titulo: "Personas nuevas en nómina", min: 0, max: 5, paso: 1, formato: v => String(v) },
    { clave: "variacionNomina", titulo: "Nómina actual", min: -20, max: 50, paso: 5, formato: signo },
    { clave: "variacionGastos", titulo: "Gastos fijos y proveedores", min: -30, max: 30, paso: 5, formato: signo },
    { clave: "variacionContado", titulo: "Ventas de contado", min: -50, max: 50, paso: 10, formato: signo },
  ];

  // Los negocios que más pesan (valor ponderado), más los que ya están marcados.
  const negocios = useMemo(() => {
    const orden = [...pipeline].sort((a, b) => b.valor * (b.probabilidad ?? 50) - a.valor * (a.probabilidad ?? 50));
    const top = orden.slice(0, MAX_NEGOCIOS);
    const extra = orden.filter(n => e.forzados.includes(claveNegocio(n)) && !top.includes(n));
    return [...top, ...extra];
  }, [pipeline, e.forzados]);

  const { base, sim } = useMemo(() => {
    const entrada = { hoy, saldoInicial: caja, cartera };
    return {
      base: proyectarCaja({ ...entrada, supuestos, pipeline }),
      sim: proyectarCaja({ ...entrada, ...aplicarEscenario(supuestos, pipeline, e) }),
    };
  }, [hoy, caja, cartera, supuestos, pipeline, e]);

  function alternarForzado(clave: string) {
    setE(prev => ({ ...prev, forzados: prev.forzados.includes(clave) ? prev.forzados.filter(k => k !== clave) : [...prev.forzados, clave] }));
  }

  const dif = sim.minimo.saldo - base.minimo.saldo;
  const resultados = [
    { titulo: "Punto más bajo", valor: millones(sim.minimo.saldo), detalle: `${diaCorto(sim.minimo.dia)} · ${Math.abs(dif) < 500_000 ? "igual al actual" : `${dif > 0 ? "+" : "–"}${millones(Math.abs(dif))} vs. actual`}`, rojo: sim.minimo.saldo < 0 },
    { titulo: "Primer día en rojo", valor: sim.primerDiaEnRojo ? diaCorto(sim.primerDiaEnRojo) : "Ninguno", detalle: sim.primerDiaEnRojo ? `en ${diasEntre(hoy, sim.primerDiaEnRojo)} días` : "en las 13 semanas", rojo: !!sim.primerDiaEnRojo },
    { titulo: "Caja al final", valor: millones(sim.saldoFinal), detalle: `actual: ${millones(base.saldoFinal)}`, rojo: sim.saldoFinal < 0 },
    ...(hayPipeline ? [{ titulo: "Negocios forzados", valor: String(e.forzados.length), detalle: e.forzados.length ? "cerrados al 100 % en su fecha" : "marque \"Cerrar\" en la lista", rojo: false }] : []),
  ];

  return (
    <div id="simulador" className={tarjeta("p-5 space-y-4 scroll-mt-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Simulador: ¿qué pasa si…?</h2>
          <p className="mt-1 text-xs text-slate-500">Mueva las palancas para ver cómo cambia la caja. No se guarda nada.</p>
        </div>
        {!esBase(e) && (
          <button type="button" onClick={() => setE({ ...ESCENARIO_BASE, costoPersona: e.costoPersona })} className={boton("secundario", "sm")}>Volver al escenario actual</button>
        )}
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
            {c.clave === "personasNuevas" && (
              <span className="mt-1 flex items-center gap-1.5 text-2xs text-slate-500">
                Costo por persona al mes
                <input inputMode="decimal" value={costoTexto} aria-label="Costo mensual por persona"
                  onChange={ev => { setCostoTexto(ev.target.value); const v = leerMonto(ev.target.value); if (v !== null && v >= 0) setE(prev => ({ ...prev, costoPersona: v })); }}
                  className={campo("sm", "w-28 py-0.5 text-right text-xs tabular-nums")} />
              </span>
            )}
          </label>
        ))}
      </div>

      {hayPipeline && (
        <details className="rounded-xl border border-slate-200 p-3" open={e.forzados.length > 0}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Forzar cierres: ¿y si estos negocios se cierran en su fecha?
          </summary>
          <ul className="mt-2 divide-y divide-slate-100">
            {negocios.map(n => {
              const k = claveNegocio(n);
              return (
                <li key={k} className="flex flex-wrap items-center gap-2 py-1.5 text-sm">
                  <input type="checkbox" checked={e.forzados.includes(k)} onChange={() => alternarForzado(k)}
                    className="h-4 w-4 accent-accent-600" aria-label={`Cerrar ${n.titulo}`} />
                  <span className="min-w-0 flex-1 text-slate-700">
                    {n.id ? <Link href={`/dashboard/pipeline/${n.id}`} className="hover:underline">{n.titulo}</Link> : n.titulo}
                  </span>
                  <span className="tabular-nums text-xs text-slate-500">
                    {millones(n.valor)} · {n.probabilidad ?? 50}% · cierre {diaCorto(n.fechaCierre)}{n.fechaCierre < hoy ? " (vencido)" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
