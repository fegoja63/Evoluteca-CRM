import { prisma } from "@/lib/prisma";
import { accesoPaginaFinanzas } from "@/lib/finanzas/datos";
import { analizarClientes, resumenClientes, type ClienteRentabilidad } from "@/lib/finanzas/rentabilidad";
import { millones, TONO_SEMAFORO } from "@/lib/finanzas/formato";
import { fechaISO, fechaDesdeBogota } from "@/lib/fecha-bogota";
import { sumarDias } from "@/lib/finanzas/caja";
import { insignia, tarjeta } from "@/components/ui/estilos";
import { cn } from "@/lib/cn";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { GraficaRentabilidad } from "@/components/finanzas/grafica-rentabilidad";
import { EditorRentabilidad } from "@/components/finanzas/editor-rentabilidad";

export const dynamic = "force-dynamic";

export default async function RentabilidadClientesPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;
  const { tenantId } = acceso;

  const [filas, tenant] = await Promise.all([
    prisma.rentabilidadCliente.findMany({ where: { tenantId }, orderBy: { ventas: "desc" } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { soloFinanzas: true } }),
  ]);
  const guardados: ClienteRentabilidad[] = filas.map(f => ({ cliente: f.cliente, ventas: Number(f.ventas), costo: Number(f.costo), diasPago: f.diasPago }));

  // Sugeridos: lo ganado en el CRM en los últimos 12 meses, por cliente.
  let sugeridosCRM: ClienteRentabilidad[] = [];
  if (!tenant?.soloFinanzas) {
    const grupos = await prisma.oportunidad.groupBy({
      by: ["empresaId"],
      where: { tenantId, eliminadoEn: null, etapa: "GANADA", empresaId: { not: null }, fechaCierre: { gte: fechaDesdeBogota(sumarDias(fechaISO(), -365)) } },
      _sum: { valor: true },
    });
    const empresas = await prisma.empresa.findMany({
      where: { tenantId, id: { in: grupos.map(g => g.empresaId!) } }, select: { id: true, nombre: true },
    });
    const nombre = new Map(empresas.map(e => [e.id, e.nombre]));
    sugeridosCRM = grupos
      .map(g => ({ cliente: nombre.get(g.empresaId!) ?? "", ventas: Number(g._sum.valor ?? 0), costo: 0, diasPago: null }))
      .filter(c => c.cliente && c.ventas > 0)
      .sort((a, b) => b.ventas - a.ventas);
  }

  const clientes = analizarClientes(guardados);
  const r = resumenClientes(clientes);

  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <p className="text-sm text-slate-600">Quién le compra más no siempre es quién le deja más. Cifras de los últimos 12 meses.</p>
      {clientes.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi titulo="Ventas de estos clientes" valor={millones(r.ventas)} detalle={`${clientes.length} clientes`} />
            <Kpi titulo="Margen bruto ponderado" valor={`${Math.round(r.margen * 100)}%`} detalle="Ventas menos costo directo" />
            <Kpi titulo="Días de pago promedio" valor={r.diasPagoPromedio === null ? "—" : `${Math.round(r.diasPagoPromedio)} días`} detalle="Ponderado por ventas" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={tarjeta("p-5")}>
              <h2 className="text-base font-semibold text-slate-800">Margen bruto por cliente</h2>
              <div className="mt-3"><GraficaRentabilidad clientes={clientes} /></div>
            </div>
            <div className={tarjeta("overflow-x-auto")}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                    <th className="px-3 py-2 text-right font-semibold">Ventas</th>
                    <th className="px-3 py-2 text-right font-semibold">Margen</th>
                    <th className="px-3 py-2 text-right font-semibold">Paga en</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map(c => (
                    <tr key={c.cliente}>
                      <td className="px-3 py-2 text-slate-700">
                        {c.cliente}
                        {c.compraMuchoDejaPoco && <span className="block text-xs font-semibold text-red-600">Le compra mucho, le deja poco</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{millones(c.ventas)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right"><span className={insignia(TONO_SEMAFORO[c.semaforo].tono)}>{Math.round(c.margen * 100)}%</span></td>
                      <td className={cn("whitespace-nowrap px-3 py-2 text-right tabular-nums", c.pagaTarde && "font-semibold text-red-600")}>{c.diasPago === null ? "—" : `${c.diasPago} d`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      <EditorRentabilidad clientes={guardados} sugeridosCRM={sugeridosCRM} soloLectura={acceso.soloLectura} />
    </MarcoFinanzas>
  );
}

function Kpi({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className={tarjeta("p-4")}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>
    </div>
  );
}
