import { accesoPaginaFinanzas } from "@/lib/finanzas/datos";
import { MarcoFinanzas, SinAccesoFinanzas } from "@/components/finanzas/marco-finanzas";
import { GerenteIA } from "@/components/finanzas/gerente-ia";

export const dynamic = "force-dynamic";

export default async function GerenteIAPage() {
  const acceso = await accesoPaginaFinanzas();
  if (acceso.bloqueo) return <SinAccesoFinanzas motivo={acceso.bloqueo} />;
  return (
    <MarcoFinanzas licencia={acceso.licencia}>
      <GerenteIA soloLectura={acceso.soloLectura} />
    </MarcoFinanzas>
  );
}
