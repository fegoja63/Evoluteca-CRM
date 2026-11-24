import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { CargarDatosFinancieros } from "@/components/finanzas/cargar-datos";
import { CarteraPorCobrar } from "@/components/finanzas/cartera-por-cobrar";
import { prisma } from "@/lib/prisma";
import { diaISO, fechaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

export default async function CargarFinanzasPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const [datos, facturas] = await Promise.all([
    cargarDatosFinancieros(acceso.tenantId),
    prisma.cuentaPorCobrar.findMany({ where: { tenantId: acceso.tenantId }, orderBy: { vence: "asc" } }),
  ]);
  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <CargarDatosFinancieros periodos={datos.periodos} balance={datos.balance} soloLectura={acceso.soloLectura} />
      <div className="mt-6">
        <CarteraPorCobrar
          facturas={facturas.map(f => ({ id: f.id, cliente: f.cliente, monto: Number(f.monto), vence: diaISO(f.vence) }))}
          carteraBalance={datos.balance?.cuentasPorCobrar ?? null} hoy={fechaISO()} soloLectura={acceso.soloLectura} />
      </div>
    </MarcoFinanzas>
  );
}
