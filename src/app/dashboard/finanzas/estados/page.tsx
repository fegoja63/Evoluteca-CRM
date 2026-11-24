import Link from "next/link";
import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { estadoResultados, sumarPeriodos, ultimosMeses, totalesBalance, balanceCuadra, TASA_RENTA, type Resultado } from "@/lib/finanzas/estados";
import { AvisoModo } from "@/components/finanzas/aviso-modo";
import { millones, mesCorto, variacion } from "@/lib/finanzas/formato";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { GraficaEstados } from "@/components/finanzas/grafica-estados";

export const dynamic = "force-dynamic";

// Filas del estado de resultados: [etiqueta, campo, es subtotal].
const FILAS_BASE: [string, keyof Resultado, boolean][] = [
  ["Ventas", "ventas", false],
  ["Costo de ventas", "costoVentas", false],
  ["Utilidad bruta", "utilidadBruta", true],
  ["Gastos de administración", "gastosAdmin", false],
  ["Gastos de ventas", "gastosVentas", false],
  ["EBITDA", "ebitda", true],
  ["Depreciación", "depreciacion", false],
  ["Gastos financieros", "intereses", false],
  ["Ingresos no operacionales", "otrosIngresos", false],
  ["Gastos no operacionales", "otrosGastos", false],
  ["Utilidad antes de impuestos", "antesDeImpuestos", true],
  ["Impuesto de renta", "impuesto", false],
  ["Utilidad neta", "utilidadNeta", true],
];

export default async function EstadosPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const { periodos, cierres, modo, balance, balanceAnterior } = await cargarDatosFinancieros(acceso.tenantId);
  const anual = modo === "anual";
  // Con un cierre anual, las columnas son años (el último y el anterior).
  const meses = (anual ? cierres.slice(-5) : ultimosMeses(periodos, 12)).map(estadoResultados);
  const u = meses[meses.length - 1];
  const a = meses[meses.length - 2];
  const total = anual ? u : estadoResultados(sumarPeriodos(meses));
  // Las partidas no operacionales solo se muestran si hay alguna.
  const conOtros = meses.some(m => (m.otrosIngresos ?? 0) !== 0 || (m.otrosGastos ?? 0) !== 0);
  const FILAS_ER = FILAS_BASE
    .filter(([, campo]) => conOtros || (campo !== "otrosIngresos" && campo !== "otrosGastos"))
    .map(([e, campo, sub]): [string, keyof Resultado, boolean] => campo === "impuesto"
      ? [u?.impuestoReal ? "Impuesto de renta (reportado por el contador)" : `Impuesto de renta estimado (${Math.round(TASA_RENTA * 100)}%)`, campo, sub]
      : [e, campo, sub]);

  if (!u && !balance) {
    return (
      <MarcoFinanzas licencia={acceso.licencia}>
        <div className={tarjeta("p-6 text-sm text-slate-600")}>
          Todavía no hay estados financieros cargados.{" "}
          {!acceso.soloLectura && <Link href="/dashboard/finanzas/subir" className={boton("primario", "sm", "ml-2")}>Subir mis estados</Link>}
        </div>
      </MarcoFinanzas>
    );
  }

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      {u && <AvisoModo modo={modo} />}
      {u && (
        <>
          <div className={tarjeta("p-5")}>
            <h2 className="text-base font-semibold text-slate-800">{anual ? "Ventas, costo y margen EBITDA, por año" : "Ventas, costo y margen EBITDA, mes a mes"}</h2>
            <div className="mt-2"><GraficaEstados meses={meses} /></div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-slate-800">{anual ? `Estado de resultados del año ${u.mes}` : "Estado de resultados"}</h2>
            <div className={tarjeta("overflow-x-auto")}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Cuenta</th>
                    <th className="px-4 py-2 text-right font-semibold">{mesCorto(u.mes)}</th>
                    {a && <th className="px-4 py-2 text-right font-semibold">{mesCorto(a.mes)}</th>}
                    {a && <th className="px-4 py-2 text-right font-semibold">Var.</th>}
                    {!anual && <th className="px-4 py-2 text-right font-semibold">{meses.length} meses</th>}
                    <th className="px-4 py-2 text-right font-semibold">% ventas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FILAS_ER.map(([etiqueta, campo, subtotal]) => {
                    const valor = (r: Resultado) => (r[campo] as number | undefined) ?? 0;
                    return (
                      <tr key={campo} className={cn(subtotal && "bg-brand-50/40 font-semibold")}>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-700">{etiqueta}</td>
                        <td className={cn("whitespace-nowrap px-4 py-2 text-right tabular-nums", valor(u) < 0 && "text-red-600")}>{millones(valor(u))}</td>
                        {a && <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">{millones(valor(a))}</td>}
                        {a && <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">{variacion(valor(u), valor(a))}</td>}
                        {!anual && <td className={cn("whitespace-nowrap px-4 py-2 text-right tabular-nums", valor(total) < 0 && "text-red-600")}>{millones(valor(total))}</td>}
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">
                          {total.ventas ? `${Math.round((valor(total) / total.ventas) * 100)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {u.impuestoReal
                ? "El impuesto de renta es el que reportó su contador en los estados financieros."
                : "El impuesto de renta es una estimación a la tarifa general; el valor real lo determina su contador."}
            </p>
          </div>
        </>
      )}

      {balance ? <TablaBalance balance={balance} anterior={balanceAnterior} /> : (
        <div className={tarjeta("p-5 text-sm text-slate-600")}>
          Falta el balance general.{" "}
          {!acceso.soloLectura && <Link href="/dashboard/finanzas/cargar#balance" className="font-semibold text-brand-700 hover:underline">Cargarlo</Link>}
        </div>
      )}
    </MarcoFinanzas>
  );
}

type BalanceConCorte = Parameters<typeof totalesBalance>[0] & { corte: string };

function TablaBalance({ balance: b, anterior: p }: { balance: BalanceConCorte; anterior: BalanceConCorte | null }) {
  const t = totalesBalance(b);
  const tp = p ? totalesBalance(p) : null;
  // [etiqueta, valor al corte, valor al corte anterior, es total]
  const activo: [string, number, number | null, boolean][] = [
    ["Caja y bancos", b.caja, p?.caja ?? null, false], ["Cuentas por cobrar", b.cuentasPorCobrar, p?.cuentasPorCobrar ?? null, false],
    ["Inventario", b.inventario, p?.inventario ?? null, false],
    ["Otros activos corrientes", b.otrosActivosCorrientes, p?.otrosActivosCorrientes ?? null, false],
    ["Activo corriente", t.activoCorriente, tp?.activoCorriente ?? null, true],
    ["Inversiones (CDT, fiducias, acciones)", b.inversiones ?? 0, p ? p.inversiones ?? 0 : null, false],
    ["Activos fijos netos", b.activosFijos, p?.activosFijos ?? null, false], ["Total activo", t.activoTotal, tp?.activoTotal ?? null, true],
  ];
  const pasivo: [string, number, number | null, boolean][] = [
    ["Proveedores", b.proveedores, p?.proveedores ?? null, false], ["Obligaciones financieras de corto plazo", b.obligacionesCP, p?.obligacionesCP ?? null, false],
    ["Impuestos y obligaciones laborales", b.impuestosLaborales, p?.impuestosLaborales ?? null, false], ["Pasivo corriente", t.pasivoCorriente, tp?.pasivoCorriente ?? null, true],
    ["Deuda de largo plazo", b.deudaLP, p?.deudaLP ?? null, false], ["Patrimonio", b.patrimonio, p?.patrimonio ?? null, true],
    ["Pasivo + patrimonio", t.pasivoTotal + b.patrimonio, tp && p ? tp.pasivoTotal + p.patrimonio : null, true],
  ];
  const Columna = ({ titulo, filas }: { titulo: string; filas: [string, number, number | null, boolean][] }) => (
    <div className={tarjeta("overflow-hidden")}>
      <div className="flex bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
        <span className="flex-1">{titulo}</span>
        <span className="w-24 text-right">{formatoDia(b.corte, { month: "short", year: "numeric" })}</span>
        {p && <span className="w-24 text-right">{formatoDia(p.corte, { month: "short", year: "numeric" })}</span>}
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {filas.map(([n, v, va, tot]) => (
            <tr key={n} className={cn(tot && "bg-brand-50/40 font-semibold")}>
              <td className="px-4 py-2 text-slate-700">{n}</td>
              <td className={cn("w-24 whitespace-nowrap px-4 py-2 text-right tabular-nums", v < 0 && "text-red-600")}>{millones(v)}</td>
              {p && <td className="w-24 whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">{va === null ? "—" : millones(va)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-slate-800">Balance general al {formatoDia(b.corte)}{p ? ` comparado con ${formatoDia(p.corte)}` : ""}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Columna titulo="Activo" filas={activo} />
        <Columna titulo="Pasivo y patrimonio" filas={pasivo} />
      </div>
      {!balanceCuadra(b) && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          El balance no cuadra: el activo difiere del pasivo más el patrimonio en {millones(t.diferencia)}. Revise las cifras en Cargar datos.
        </p>
      )}
    </div>
  );
}
