import { accesoPaginaFinanzas, cargarDatosFinancieros } from "@/lib/finanzas/datos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { CargarDatosFinancieros } from "@/components/finanzas/cargar-datos";

export const dynamic = "force-dynamic";

export default async function CargarFinanzasPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;

  const datos = await cargarDatosFinancieros(acceso.tenantId);
  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <CargarDatosFinancieros periodos={datos.periodos} balance={datos.balance} soloLectura={acceso.soloLectura} />
    </MarcoFinanzas>
  );
}
