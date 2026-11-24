import { accesoPaginaFinanzas } from "@/lib/finanzas/datos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { InformeFinanciero } from "@/components/finanzas/informe-financiero";

export const dynamic = "force-dynamic";

// Gerente Financiero › Informe de análisis financiero (ver lib/finanzas/informe.ts).
export default async function InformeFinancieroPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;
  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <InformeFinanciero soloLectura={acceso.soloLectura} />
    </MarcoFinanzas>
  );
}
