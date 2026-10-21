import Link from "next/link";
import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { estadoResultados, sumarPeriodos, ultimosMeses, totalesBalance, balanceCuadra, TASA_RENTA, type Resultado } from "@/lib/finanzas/estados";
import { millones, mesCorto, variacion } from "@/lib/finanzas/formato";
import { formatoDia } from "@/lib/fecha-bogota";
import { boton, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { GraficaEstados } from "@/components/finanzas/grafica-estados";

export const dynamic = "force-dynamic";

// Filas del estado de resultados: [etiqueta, campo, es subtotal].
const FILAS_ER: [string, keyof Resultado, boolean][] = [
  ["Ventas", "ventas", false],
  ["Costo de ventas", "costoVentas", false],
  ["Utilidad bruta", "utilidadBruta", true],
  ["Gastos de administración", "gastosAdmin", false],
  ["Gastos de ventas", "gastosVentas", false],
  ["EBITDA", "ebitda", true],
  ["Depreciación", "depreciacion", false],
  ["Intereses", "intereses", false],
  ["Utilidad antes de impuestos", "antesDeImpuestos", true],
  [`Impuesto de renta estimado (${Math.round(TASA_RENTA * 100)}%)`, "impuesto", false],
  ["Utilidad neta", "utilidadNeta", true],
];

export default async function EstadosPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const { periodos, balance } = await cargarDatosFinancieros(acceso.tenantId);
  const meses = ultimosMeses(periodos, 12).map(estadoResultados);
  const u = meses[meses.length - 1];
  const a = meses[meses.length - 2];
  const total = estadoResultados(sumarPeriodos(meses));

  if (!u && !balance) {
    return (
      <MarcoFinanzas licencia={acceso.licencia}>
        <div className={tarjeta("p-6 text-sm text-slate-600")}>
          Todavía no hay estados financieros cargados.{" "}
          {!acceso.soloLectura && <Link href="/dashboard/finanzas/cargar" className={boton("primario", "sm", "ml-2")}>Cargar mis datos</Link>}
        </div>
      </MarcoFinanzas>
    );
  }

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      {u && (
        <>
          <div className={tarjeta("p-5")}>
            <h2 className="text-base font-semibold text-slate-800">Ventas, costo y margen EBITDA, mes a mes</h2>
            <div className="mt-2"><GraficaEstados meses={meses} /></div>
          </div>

          <div>
            <h2 className="mb-2 text-base font-semibold text-slate-800">Estado de resultados</h2>
            <div className={tarjeta("overflow-x-auto")}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Cuenta</th>
                    <th className="px-4 py-2 text-right font-semibold">{mesCorto(u.mes)}</th>
                    {a && <th className="px-4 py-2 text-right font-semibold">{mesCorto(a.mes)}</th>}
                    {a && <th className="px-4 py-2 text-right font-semibold">Var.</th>}
                    <th className="px-4 py-2 text-right font-semibold">{meses.length} meses</th>
                    <th className="px-4 py-2 text-right font-semibold">% ventas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FILAS_ER.map(([etiqueta, campo, subtotal]) => {
                    const valor = (r: Resultado) => r[campo] as number;
                    return (
                      <tr key={campo} className={cn(subtotal && "bg-brand-50/40 font-semibold")}>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-700">{etiqueta}</td>
                        <td className={cn("whitespace-nowrap px-4 py-2 text-right tabular-nums", valor(u) < 0 && "text-red-600")}>{millones(valor(u))}</td>
                        {a && <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">{millones(valor(a))}</td>}
                        {a && <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-slate-500">{variacion(valor(u), valor(a))}</td>}
                        <td className={cn("whitespace-nowrap px-4 py-2 text-right tabular-nums", valor(total) < 0 && "text-red-600")}>{millones(valor(total))}</td>
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
              El impuesto de renta es una estimación a la tarifa general; el valor real lo determina su contador.
            </p>
          </div>
        </>
      )}

      {balance ? <TablaBalance balance={balance} /> : (
        <div className={tarjeta("p-5 text-sm text-slate-600")}>
          Falta el balance general.{" "}
          {!acceso.soloLectura && <Link href="/dashboard/finanzas/cargar#balance" className="font-semibold text-brand-700 hover:underline">Cargarlo</Link>}
        </div>
      )}
    </MarcoFinanzas>
  );
}

function TablaBalance({ balance: b }: { balance: Parameters<typeof totalesBalance>[0] & { corte: string } }) {
  const t = totalesBalance(b);
  const activo: [string, number, boolean][] = [
    ["Caja y bancos", b.caja, false], ["Cuentas por cobrar", b.cuentasPorCobrar, false], ["Inventario", b.inventario, false],
    ["Otros activos corrientes", b.otrosActivosCorrientes, false], ["Activo corriente", t.activoCorriente, true],
    ["Activos fijos netos", b.activosFijos, false], ["Total activo", t.activoTotal, true],
  ];
  const pasivo: [string, number, boolean][] = [
    ["Proveedores", b.proveedores, false], ["Obligaciones financieras de corto plazo", b.obligacionesCP, false],
    ["Impuestos y obligaciones laborales", b.impuestosLaborales, false], ["Pasivo corriente", t.pasivoCorriente, true],
    ["Deuda de largo plazo", b.deudaLP, false], ["Patrimonio", b.patrimonio, true], ["Pasivo + patrimonio", t.pasivoTotal + b.patrimonio, true],
  ];
  const Columna = ({ titulo, filas }: { titulo: string; filas: [string, number, boolean][] }) => (
    <div className={tarjeta("overflow-hidden")}>
      <p className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">{titulo}</p>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {filas.map(([n, v, tot]) => (
            <tr key={n} className={cn(tot && "bg-brand-50/40 font-semibold")}>
              <td className="px-4 py-2 text-slate-700">{n}</td>
              <td className={cn("whitespace-nowrap px-4 py-2 text-right tabular-nums", v < 0 && "text-red-600")}>{millones(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-slate-800">Balance general al {formatoDia(b.corte)}</h2>
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
